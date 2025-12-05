import os
import json
import logging
import asyncio
from langdetect import detect, LangDetectException
from deep_translator import GoogleTranslator
from google.generativeai import GenerativeModel
import google.generativeai as genai
from redis.asyncio import Redis
from src.worker.tasks import sync_translation_to_db_task, update_usage_stats_task

logger = logging.getLogger(__name__)

# Config GenAI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("Missing GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
gemini_model = GenerativeModel('gemini-1.5-flash')

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def _normalize(self, text: str) -> str:
        return text.strip().lower()

    def _get_redis_key(self, lang: str, text: str) -> str:
        return f"lex:{lang}:{self._normalize(text)}"

    def detect_language(self, text: str) -> str:
        try:
            # Langdetect is fast and offline
            return detect(text)
        except LangDetectException:
            return "en" # Fallback if detection fails

    async def lpm_translate(self, text: str, src_lang: str, target_lang: str):
        """
        Longest Phrase Matching: Only reads from Redis.
        """
        words = text.split()
        n = len(words)
        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            # Max window size 8 words to balance speed/accuracy
            max_window = min(n - i, 8)
            
            for j in range(max_window, 0, -1):
                phrase = " ".join(words[i : i + j])
                key = self._get_redis_key(src_lang, phrase)
                
                # ONLY READ REDIS
                cached_data = await self.redis.get(key)
                if cached_data:
                    data = json.loads(cached_data)
                    if target_lang in data:
                        logger.debug(f"[CACHE HIT] Found '{phrase}' in Redis")
                        translated_chunks.append(data[target_lang])
                        matched_words_count += j
                        i += j
                        matched = True
                        
                        # FIRE AND FORGET: Update usage stats task
                        update_usage_stats_task.delay(phrase, src_lang)
                        break
            
            if not matched:
                # logger.debug(f"[CACHE MISS] No cache for '{words[i]}'")
                translated_chunks.append(words[i])
                i += 1
        
        return " ".join(translated_chunks), (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> tuple[str, str]:
        """
        Main Translation Entrypoint.
        Returns: (translated_text, detected_source_lang)
        """
        if not text or not text.strip(): return "", source_lang_hint

        # 1. Detect Source Language
        # If hint is 'auto' or missing, use langdetect
        detected_lang = source_lang_hint
        if source_lang_hint == "auto" or not source_lang_hint:
            detected_lang = await asyncio.to_thread(self.detect_language, text)
        
        # Standardize language codes (e.g., zh-cn -> zh) if needed
        if detected_lang.startswith("zh"): detected_lang = "zh"

        # 2. Optimization: If source == target, return original immediately
        if detected_lang == target_lang:
            return text, detected_lang

        # 3. Try LPM (Redis)
        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        # Threshold: If 80% of text is covered by cache, return LPM result
        if coverage >= 0.8:
            return lpm_result, detected_lang
            
        # 4. Fallback to External APIs (Cache Miss)
        try:
            final_text = ""
            # Logic: Short sentences (< 15 words) use DeepTranslator (Free API)
            # Long sentences use Gemini (Context aware)
            if len(text.split()) < 15:
                # Run synchronous call in thread pool to avoid blocking asyncio loop
                final_text = await asyncio.to_thread(
                    GoogleTranslator(source=detected_lang, target=target_lang).translate, 
                    text
                )
            else:
                prompt = f"Translate strictly from {detected_lang} to {target_lang}: {text}"
                response = await gemini_model.generate_content_async(prompt)
                final_text = response.text.strip()

            if not final_text:
                return lpm_result, detected_lang # Return LPM if API fails

            # 5. WRITE: Push to Worker for DB persistence and Redis update
            sync_translation_to_db_task.delay(
                original_text=text, 
                src_lang=detected_lang, 
                translations={target_lang: final_text}
            )
            
            # UX Optimization: Update Redis immediately with short TTL
            # so subsequent requests get it fast while Worker saves to DB
            key = self._get_redis_key(detected_lang, text)
            current_cache = await self.redis.get(key)
            new_data = json.loads(current_cache) if current_cache else {}
            new_data[target_lang] = final_text
            await self.redis.set(key, json.dumps(new_data), ex=300)

            return final_text, detected_lang
            
        except Exception as e:
            logger.error(f"External Translation Failed: {e}")
            return lpm_result, detected_lang

# Singleton Getter
_translator = None
def get_translator(redis_client: Redis) -> HybridTranslator:
    global _translator
    if not _translator:
        _translator = HybridTranslator(redis_client)
    return _translator