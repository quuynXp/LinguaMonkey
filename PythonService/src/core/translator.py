import logging
import re
import json
import string
import asyncio
import os
from typing import List, Tuple
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from langdetect import detect, LangDetectException
import google.generativeai as genai
from google.generativeai import GenerativeModel
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

TRANSLATION_MODEL_TIERS = [
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Fallback"},
]

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def _normalize(self, text: str) -> str:
        if not text: return ""
        text = re.sub(r'[^\w\s]', '', text) 
        text = re.sub(r'\s+', ' ', text)
        return text.strip().lower()

    def _get_redis_key(self, lang: str, text: str) -> str:
        return f"lex:{lang}:{self._normalize(text)}"
    
    def _map_language_code(self, lang: str) -> str:
        if not lang: return "en"
        lang = lang.lower().strip()
        if lang in ['vn', 'vietnamese', 'vi-vn', 'vi']: return 'vi'
        if lang in ['zh', 'zh-cn', 'cn']: return 'zh-CN'
        return lang.split('-')[0] if '-' in lang else lang

    def detect_language(self, text: str) -> str:
        try: return detect(text)
        except LangDetectException: return "en"

    def _tokenize(self, text: str, lang: str) -> List[str]:
        if not text: return []
        if lang in ['zh-CN', 'zh-TW', 'ja', 'ko']:
            return [char for char in text if char.strip() and char not in string.punctuation]
        return self._normalize(text).split()

    async def _save_to_db(self, original_text: str, src_lang: str, target_lang: str, translated_text: str):
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                )
                result = await db.execute(stmt)
                entry = result.scalar_one_or_none()

                if entry:
                    current = dict(entry.translations) if entry.translations else {}
                    current[target_lang] = translated_text
                    entry.translations = current
                    flag_modified(entry, "translations")
                    entry.usage_count += 1
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
                logger.error(f"DB Save Error: {e}")
                await db.rollback()

    async def lpm_translate(self, text: str, src_lang: str, target_lang: str) -> Tuple[str, float]:
        """
        Thuật toán Longest Prefix Match:
        Cố gắng tìm cụm từ dài nhất trong DB khớp với đoạn đầu câu.
        """
        words = self._tokenize(text, src_lang)
        n = len(words)
        if n == 0: return text, 0.0

        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            max_window = min(n - i, 8) 
            
            for j in range(max_window, 0, -1):
                if src_lang in ['zh-CN', 'ja']:
                    phrase = "".join(words[i : i + j])
                else:
                    phrase = " ".join(words[i : i + j])

                key = self._get_redis_key(src_lang, phrase)
                cached_val = await self.redis.hget(key, target_lang)
                
                if cached_val:
                    trans_text = cached_val.decode('utf-8') if isinstance(cached_val, bytes) else str(cached_val)
                    
                    if trans_text.lower() != phrase.lower():
                        translated_chunks.append(trans_text)
                        asyncio.create_task(self.redis.hincrby(key, "usage", 1))
                        
                        matched_words_count += j
                        i += j
                        matched = True
                        break
            
            if not matched:
                translated_chunks.append(words[i])
                i += 1
        
        separator = "" if src_lang in ['zh-CN', 'ja'] and target_lang in ['zh-CN', 'ja'] else " "
        return separator.join(translated_chunks), (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, src_hint: str, target_lang: str) -> Tuple[str, str]:
        if not text or not text.strip(): return "", src_hint
        
        src_lang = self._map_language_code(src_hint)
        tgt_lang = self._map_language_code(target_lang)
        
        detected_lang = src_lang
        if detected_lang == "auto":
            detected_lang = await asyncio.to_thread(self.detect_language, text)
            detected_lang = self._map_language_code(detected_lang)

        if detected_lang == tgt_lang: return text, detected_lang

        lpm_res, coverage = await self.lpm_translate(text, detected_lang, tgt_lang)
        
        threshold = 0.8 if len(text.split()) > 3 else 0.99
        if coverage >= threshold:
            return lpm_res, detected_lang

        if not GOOGLE_API_KEY: return lpm_res, detected_lang

        prompt = (
            f"Translate this text from {detected_lang} to {tgt_lang}. Output JSON only.\n"
            f"Text: \"{text}\"\nJSON: {{\"translated_text\": \"...\", \"detected_lang\": \"{detected_lang}\"}}"
        )

        for tier in TRANSLATION_MODEL_TIERS:
            try:
                model = GenerativeModel(tier["name"], generation_config={"response_mime_type": "application/json"})
                resp = await model.generate_content_async(prompt)
                parsed = json.loads(resp.text)
                final_text = parsed.get("translated_text", "").strip()
                
                if final_text and final_text.lower() != text.lower():
                    if len(text.split()) < 20:
                        k = self._get_redis_key(detected_lang, text)
                        await self.redis.hset(k, mapping={tgt_lang: final_text})
                        await self.redis.expire(k, 86400 * 7)
                        asyncio.create_task(self._save_to_db(text, detected_lang, tgt_lang, final_text))
                    
                    return final_text, parsed.get("detected_lang", detected_lang)
            except Exception as e: 
                logger.error(f"Gemini Error ({tier['name']}): {e}")
                continue

        return lpm_res, detected_lang

_translator = None
def get_translator(redis: Redis) -> HybridTranslator:
    global _translator
    if not _translator: _translator = HybridTranslator(redis)
    else: _translator.redis = redis
    return _translator