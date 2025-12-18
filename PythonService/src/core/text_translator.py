import os
import logging
import asyncio
import json
import re
from typing import Tuple, List
from langdetect import detect, LangDetectException
import google.generativeai as genai
from google.generativeai import GenerativeModel
from google.api_core.exceptions import ResourceExhausted, NotFound, PermissionDenied, GoogleAPICallError
from redis.asyncio import Redis
from sqlalchemy import select
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.error("Missing GOOGLE_API_KEY. Text translation fallback will fail.")

TRANSLATION_MODEL_TIERS = [
    {"name": "gemini-2.5-flash", "purpose": "Flash - High-Speed Translation"},
    {"name": "gemini-2.5-pro", "purpose": "Pro - High-Quality Translation (as fallback)"},
    {"name": "gemini-2.0-flash", "purpose": "Legacy Flash - Cost Effective Fallback"},
]

class TextTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        logger.info("TextTranslator initialized.")

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
        if not text: return []
        
        if lang in ['zh-CN', 'zh-TW', 'ja', 'ko', 'zh']:
            return [char for char in text if char.strip()]

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
        if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh']:
             words = list(text) 
        else:
             words = text.split() 
        
        n = len(words)
        if n == 0: return text, 0.0

        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            max_window = min(n - i, 8)
            
            for j in range(max_window, 0, -1):
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
                    asyncio.create_task(self.redis.hincrby(key, "usage", 1))
                    
                    matched_words_count += j
                    i += j
                    matched = True
                    break
            
            if not matched:
                translated_chunks.append(words[i])
                i += 1
        
        if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh'] and target_lang in ['zh-CN', 'zh-TW', 'ja', 'zh']:
             final_text = "".join(translated_chunks)
        else:
             final_text = " ".join(translated_chunks)

        return final_text, (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> Tuple[str, str]:
        if not text or not text.strip(): return "", source_lang_hint

        src_lang = self._map_language_code(source_lang_hint)
        target_lang = self._map_language_code(target_lang)

        detected_lang = src_lang
        if detected_lang == "auto" or not detected_lang:
            detected_lang = await asyncio.to_thread(self.detect_language, text)
            detected_lang = self._map_language_code(detected_lang)

        if detected_lang == target_lang:
            return text, detected_lang

        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        is_dictionary_dump = False
        if len(text.split()) > 1:
            if len(lpm_result) > len(text) * 4: 
                is_dictionary_dump = True
        
        threshold = 0.90 if len(text.split()) > 2 else 0.99
        if coverage >= threshold and not is_dictionary_dump:
            return lpm_result, detected_lang

        if not GOOGLE_API_KEY:
            return lpm_result, detected_lang

        target_lang_name = target_lang
        if target_lang == 'zh-CN': target_lang_name = "Simplified Chinese"
        elif target_lang == 'vi': target_lang_name = "Vietnamese"
        elif target_lang == 'en': target_lang_name = "English"

        prompt = (
            f"Translate the following text from {detected_lang} to {target_lang_name}.\n"
            f"Text: {text}\n"
            "Requirements:\n"
            "1. Output ONLY JSON.\n"
            "2. Format: {\"translated_text\": \"string\", \"detected_source_lang\": \"string\"}\n"
            "3. Keep special characters, emojis, and numbers intact."
        )

        for tier in TRANSLATION_MODEL_TIERS:
            current_model_name = tier["name"]
            
            try:
                model = GenerativeModel(
                    current_model_name,
                    generation_config={"temperature": 0.1, "max_output_tokens": 1024, "response_mime_type": "application/json"}
                )
                
                response = await model.generate_content_async(prompt)
                raw = response.text.strip()

                json_match = re.search(r'\{.*\}', raw, re.DOTALL)
                if json_match:
                    raw = json_match.group(0)
                
                parsed = json.loads(raw)
                final_text = parsed.get("translated_text", "").strip()
                detected_from_model = parsed.get("detected_source_lang", detected_lang)
                
                if final_text:
                    if len(text.split()) < 20: 
                        key = self._get_redis_key(detected_lang, text)
                        await self.redis.hset(key, mapping={target_lang: final_text})
                        await self.redis.expire(key, 86400 * 7)
                        asyncio.create_task(self._save_to_db(text, detected_lang, target_lang, final_text))
                    
                    logger.info(f"Successfully translated using {current_model_name}")
                    return final_text, detected_from_model
                else:
                    logger.warning(f"Model {current_model_name} returned empty text. Falling back...")
                    continue

            except ResourceExhausted:
                logger.warning(f"Rate limit hit for model {current_model_name}. Falling back...")
                continue
            except NotFound as e:
                logger.error(f"Model {current_model_name} not found: {str(e)}")
                continue 
            except PermissionDenied as e:
                logger.critical(f"Permission denied for model {current_model_name}: {str(e)}")
                return lpm_result, detected_lang
            except (GoogleAPICallError, json.JSONDecodeError) as e:
                logger.error(f"Error with {current_model_name}: {type(e).__name__} - {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Generic error with {current_model_name}: {str(e)}")
                continue 

        logger.error(f"External Text Translation Failed for '{text}': All model tiers failed.")
        return lpm_result, detected_lang

_text_translator = None

def get_text_translator(redis_client: Redis) -> TextTranslator:
    global _text_translator
    if _text_translator is None:
        _text_translator = TextTranslator(redis_client)
    else:
        _text_translator.redis = redis_client
    return _text_translator