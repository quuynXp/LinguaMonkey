import os
import json
import logging
from deep_translator import GoogleTranslator
from google.generativeai import GenerativeModel
import google.generativeai as genai
from redis.asyncio import Redis
from src.worker.tasks import sync_translation_to_db_task, update_usage_stats_task

logger = logging.getLogger(__name__)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
gemini_model = GenerativeModel('gemini-1.5-flash')

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def _normalize(self, text: str) -> str:
        return text.strip().lower()

    def _get_redis_key(self, lang: str, text: str) -> str:
        return f"lex:{lang}:{self._normalize(text)}"

    async def lpm_translate(self, text: str, src_lang: str, target_lang: str):
        words = text.split()
        n = len(words)
        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            max_window = min(n - i, 8)
            
            for j in range(max_window, 0, -1):
                phrase = " ".join(words[i : i + j])
                key = self._get_redis_key(src_lang, phrase)
                
                cached_data = await self.redis.get(key)
                if cached_data:
                    data = json.loads(cached_data)
                    if target_lang in data:
                        logger.info(f"[CACHE HIT] Found '{phrase}' in Redis")
                        translated_chunks.append(data[target_lang])
                        matched_words_count += j
                        i += j
                        matched = True
                        update_usage_stats_task.delay(phrase, src_lang)
                        break
            
            if not matched:
                logger.info(f"[CACHE MISS] No cache for '{words[i]}'")
                translated_chunks.append(words[i])
                i += 1
        
        return " ".join(translated_chunks), (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, src_lang: str, target_lang: str) -> tuple[str, str]:
        if not text: return "", ""
        if src_lang == target_lang: return text, ""
        
        lpm_result, coverage = await self.lpm_translate(text, src_lang, target_lang)
        
        if coverage >= 0.8:
            return lpm_result, ""
            
        try:
            final_text = ""
            if len(text.split()) < 15:
                import asyncio
                final_text = await asyncio.to_thread(
                    GoogleTranslator(source=src_lang, target=target_lang).translate, 
                    text
                )
            else:
                prompt = f"Translate strictly to {target_lang}: {text}"
                response = await gemini_model.generate_content_async(prompt)
                final_text = response.text.strip()

            if not final_text:
                return lpm_result, "API returned empty"

            sync_translation_to_db_task.delay(
                original_text=text, 
                src_lang=src_lang, 
                translations={target_lang: final_text}
            )
            
            key = self._get_redis_key(src_lang, text)
            await self.redis.set(key, json.dumps({target_lang: final_text}), ex=300)

            return final_text, ""
            
        except Exception as e:
            logger.error(f"External Translation Failed: {e}")
            return lpm_result, f"Fallback to LPM due to: {str(e)}"

_translator = None
def get_translator(redis_client: Redis) -> HybridTranslator:
    global _translator
    if not _translator:
        _translator = HybridTranslator(redis_client)
    return _translator