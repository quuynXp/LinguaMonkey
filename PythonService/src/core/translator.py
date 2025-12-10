import os
import logging
import asyncio
import json
import re
from typing import Tuple, List
from langdetect import detect, LangDetectException
import google.generativeai as genai
from google.generativeai import GenerativeModel
from redis.asyncio import Redis
from sqlalchemy import select
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Config GenAI (Load Once at Module Level)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
gemini_model = None

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = GenerativeModel(
        'gemini-2.0-flash', # Upgraded to 2.0-flash for speed if available, or keep 1.5-flash
        generation_config={"temperature": 0.1, "max_output_tokens": 1024, "response_mime_type": "application/json"}
    )
else:
    logger.error("Missing GOOGLE_API_KEY. Translation fallback will fail.")

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        logger.info("HybridTranslator initialized.")

    def _normalize(self, text: str) -> str:
        if not text: return ""
        return text.strip().lower()

    def _get_redis_key(self, lang: str, text: str) -> str:
        return f"lex:{lang}:{self._normalize(text)}"
    
    def _map_language_code(self, lang: str) -> str:
        if not lang: return "en"
        lang = lang.lower().strip()
        if lang in ['vn', 'vietnamese', 'vi-vn']: return 'vi'
        if lang in ['en', 'english', 'en-us', 'en-uk']: return 'en'
        if lang in ['zh', 'chinese', 'zh-cn', 'cn']: return 'zh-CN'
        if lang in ['zh-tw', 'tw']: return 'zh-TW'
        if lang in ['ja', 'japanese', 'jp']: return 'ja'
        if lang in ['ko', 'korean', 'kr']: return 'ko'
        return lang

    def detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "en"

    def _tokenize(self, text: str, lang: str) -> List[str]:
        """
        Better tokenizer handling punctuation and CJK characters.
        """
        if not text: return []
        
        # For CJK (Chinese, Japanese, Korean), fallback to character-based splitting
        # unless specific tokenizer libraries (jieba, mecab) are added.
        if lang in ['zh-CN', 'zh-TW', 'ja', 'ko', 'zh']:
            # Simple approach: split by characters for CJK, but keep english words intact
            # This regex matches CJK ranges
            return [char for char in text if char.strip()]

        # For Latin/Vietnamese: Split by non-word characters but keep them for reconstruction potentially?
        # Current logic: Simple splitting by non-alphanumeric to find matches in Redis
        # \w includes [a-zA-Z0-9_] and unicode characters depending on locale
        return re.findall(r'\b\w+\b', text) if text else []

    async def _save_to_db(self, original_text: str, src_lang: str, target_lang: str, translated_text: str):
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                )
                result = await db.execute(stmt)
                lexicon_entry = result.scalar_one_or_none()

                if lexicon_entry:
                    current_translations = dict(lexicon_entry.translations) if lexicon_entry.translations else {}
                    current_translations[target_lang] = translated_text
                    
                    lexicon_entry.translations = current_translations
                    lexicon_entry.usage_count += 1
                else:
                    new_entry = TranslationLexicon(
                        original_text=original_text,
                        original_lang=src_lang,
                        translations={target_lang: translated_text},
                        usage_count=1
                    )
                    db.add(new_entry)
                
                await db.commit()
            except Exception as e:
                logger.error(f"❌ Failed to save translation to DB: {e}")
                await db.rollback()

    async def lpm_translate(self, text: str, src_lang: str, target_lang: str) -> Tuple[str, float]:
        """
        Longest Prefix Match translation using Redis.
        """
        # Improved tokenization
        if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh']:
             # Use the raw text window sliding for CJK
             words = list(text) 
        else:
             words = text.split() # Simple split preserves spaces logic for reconstruction
        
        n = len(words)
        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            # Look ahead window of up to 8 tokens
            max_window = min(n - i, 8)
            
            for j in range(max_window, 0, -1):
                # Reconstruct phrase based on lang
                if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh']:
                    phrase = "".join(words[i : i + j])
                else:
                    phrase = " ".join(words[i : i + j])

                key = self._get_redis_key(src_lang, phrase)
                
                cached_val = await self.redis.hget(key, target_lang)
                
                if cached_val:
                    if isinstance(cached_val, bytes):
                        trans_text = cached_val.decode('utf-8')
                    else:
                        trans_text = str(cached_val)

                    translated_chunks.append(trans_text)
                    # Async increment usage without waiting
                    asyncio.create_task(self.redis.hincrby(key, "usage", 1))
                    
                    matched_words_count += j
                    i += j
                    matched = True
                    break
            
            if not matched:
                translated_chunks.append(words[i])
                i += 1
        
        # Reconstruction
        if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh'] and target_lang in ['zh-CN', 'zh-TW', 'ja', 'zh']:
             final_text = "".join(translated_chunks)
        else:
             final_text = " ".join(translated_chunks)

        return final_text, (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> Tuple[str, str]:
        if not text or not text.strip(): return "", source_lang_hint

        src_lang = self._map_language_code(source_lang_hint)
        target_lang = self._map_language_code(target_lang)

        # Use hint if provided and not auto, else detect
        detected_lang = src_lang
        if detected_lang == "auto" or not detected_lang:
            detected_lang = await asyncio.to_thread(self.detect_language, text)
            detected_lang = self._map_language_code(detected_lang)

        # Same language optimization
        if detected_lang == target_lang:
            return text, detected_lang

        # 1. Try LPM (Fast Path)
        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        # Check if LPM result is garbage (e.g. dictionary dump)
        is_dictionary_dump = False
        if len(text.split()) > 1:
            if len(lpm_result) > len(text) * 4: # Loosened threshold
                is_dictionary_dump = True
        
        # If coverage is high, trust LPM
        if coverage >= 0.90 and not is_dictionary_dump:
            return lpm_result, detected_lang

        if not gemini_model:
            return lpm_result, detected_lang

        # 2. Call Gemini with strict JSON prompt
        try:
            target_lang_name = target_lang
            if target_lang == 'zh-CN': target_lang_name = "Simplified Chinese"
            elif target_lang == 'vi': target_lang_name = "Vietnamese"

            prompt = (
                f"Translate the following text from {detected_lang} to {target_lang_name}.\n"
                f"Text: {text}\n"
                "Requirements:\n"
                "1. Output ONLY JSON.\n"
                "2. Format: {\"translated_text\": \"string\", \"detected_source_lang\": \"string\"}\n"
                "3. Keep special characters, emojis, and numbers intact."
            )
            
            response = await gemini_model.generate_content_async(prompt)
            raw = response.text.strip()

            # Strip markdown code blocks if present
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.endswith("```"):
                raw = raw[:-3]

            parsed = json.loads(raw)
            final_text = parsed.get("translated_text", "").strip()
            detected_from_model = parsed.get("detected_source_lang", detected_lang)
            
            if final_text:
                # Cache valid result
                # Only cache short sentences to avoid cache pollution with paragraphs
                if len(text.split()) < 20: 
                    key = self._get_redis_key(detected_lang, text)
                    await self.redis.hset(key, mapping={target_lang: final_text})
                    await self.redis.expire(key, 86400 * 7) # 7 days
                    asyncio.create_task(self._save_to_db(text, detected_lang, target_lang, final_text))
                
                return final_text, detected_from_model
            
            return lpm_result, detected_lang

        except Exception as e:
            logger.error(f"External Translation Failed: {e}")
            # Final fallback to LPM result so we always show *something*
            return lpm_result, detected_lang

_translator = None

def get_translator(redis_client: Redis) -> HybridTranslator:
    global _translator
    if _translator is None:
        _translator = HybridTranslator(redis_client)
    else:
        _translator.redis = redis_client
    return _translator