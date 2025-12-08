import os
import logging
import asyncio
from typing import Tuple
from langdetect import detect, LangDetectException
import google.generativeai as genai
from google.generativeai import GenerativeModel
from redis.asyncio import Redis
from sqlalchemy import select
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Config GenAI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("Missing GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
# Use Flash for speed. Adjust temperature to 0.1 for consistent translations.
gemini_model = GenerativeModel(
    'gemini-2.5-flash',
    generation_config={"temperature": 0.1, "max_output_tokens": 1024}
)

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def _normalize(self, text: str) -> str:
        if not text: return ""
        return text.strip().lower()

    def _get_redis_key(self, lang: str, text: str) -> str:
        return f"lex:{lang}:{self._normalize(text)}"
    
    def _map_language_code(self, lang: str) -> str:
        """
        Chuẩn hóa mã ngôn ngữ. Gemini và các thư viện thường yêu cầu mã chuẩn (ISO 639-1/BCP-47).
        """
        lang = lang.lower().strip()
        # Map các trường hợp đặc biệt
        if lang in ['vn', 'vietnamese']: return 'vi'
        if lang in ['zh', 'chinese', 'zh-cn', 'cn']: return 'zh-CN' # Mặc định zh là Simplified
        if lang in ['zh-tw', 'tw']: return 'zh-TW'
        if lang in ['jp', 'japanese']: return 'ja'
        if lang in ['kr', 'korean']: return 'ko'
        logger.error(f"Language checked: {lang}")
        return lang

    def detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "en"

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
                
                cached_val = await self.redis.hget(key, target_lang)
                
                if cached_val:
                    if isinstance(cached_val, bytes):
                        trans_text = cached_val.decode('utf-8')
                    else:
                        trans_text = str(cached_val)

                    translated_chunks.append(trans_text)
                    # Update usage (Async - fire and forget)
                    await self.redis.hincrby(key, "usage", 1)
                    
                    matched_words_count += j
                    i += j
                    matched = True
                    break
            
            if not matched:
                translated_chunks.append(words[i])
                i += 1
        
        return " ".join(translated_chunks), (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> Tuple[str, str]:
        if not text or not text.strip(): return "", source_lang_hint

        # 1. Detect & Normalize Source Language
        detected_lang = source_lang_hint
        if not source_lang_hint or source_lang_hint == "auto":
            detected_lang = await asyncio.to_thread(self.detect_language, text)
        
        # Chuẩn hóa mã ngôn ngữ (quan trọng để tránh lỗi thư viện)
        detected_lang = self._map_language_code(detected_lang)
        target_lang = self._map_language_code(target_lang)

        # 2. Optimization: Source == Target
        if detected_lang == target_lang:
            return text, detected_lang

        # 3. Try LPM (Redis Hash) - Fast Path
        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        # Heuristic check: Dictionary Dump
        is_dictionary_dump = False
        if len(text.split()) > 1:
            if len(lpm_result) > len(text) * 3:
                is_dictionary_dump = True
            elif "To " in lpm_result and "," in lpm_result:
                is_dictionary_dump = True
        
        # If coverage is high enough, return immediately
        if coverage >= 0.85 and not is_dictionary_dump:
            return lpm_result, detected_lang

        # 4. Fallback to Gemini Flash
        try:
            final_text = ""
            
            # Xử lý ngôn ngữ đích trong prompt rõ ràng hơn
            target_lang_name = target_lang
            if target_lang == 'zh-CN': target_lang_name = "Simplified Chinese"
            elif target_lang == 'zh-TW': target_lang_name = "Traditional Chinese"
            elif target_lang == 'vi': target_lang_name = "Vietnamese"

            prompt = (
                f"Translate the following text from {detected_lang} to {target_lang_name}. "
                f"Output ONLY the translated text. Do not add quotes, notes or explanations.\n"
                f"Text: {text}"
            )
            
            response = await gemini_model.generate_content_async(prompt)
            final_text = response.text.strip()

            if not final_text:
                return lpm_result, detected_lang 

            # 5. WRITE BACK
            if len(text.split()) < 15: # Cache câu ngắn/vừa
                key = self._get_redis_key(detected_lang, text)
                
                await self.redis.hset(key, mapping={target_lang: final_text})
                await self.redis.expire(key, 86400 * 7)

                asyncio.create_task(self._save_to_db(text, detected_lang, target_lang, final_text))

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
    _translator.redis = redis_client
    return _translator