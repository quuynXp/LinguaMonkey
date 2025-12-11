import os
import logging
import asyncio
import json
import re
import string
from typing import Tuple, List, Dict, Any
from langdetect import detect, LangDetectException
import google.generativeai as genai
from google.generativeai import GenerativeModel
from google.api_core.exceptions import ResourceExhausted, NotFound, PermissionDenied, GoogleAPICallError
from redis.asyncio import Redis
from sqlalchemy import select
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Config GenAI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.error("Missing GOOGLE_API_KEY. Translation fallback will fail.")

TRANSLATION_MODEL_TIERS = [
    {"name": "gemini-2.5-flash", "purpose": "Flash - High-Speed Translation"},
    {"name": "gemini-2.5-pro", "purpose": "Pro - High-Quality Translation (as fallback)"},
    {"name": "gemini-2.0-flash", "purpose": "Legacy Flash - Cost Effective Fallback"},
]

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        logger.info("HybridTranslator initialized.")

    def _normalize(self, text: str) -> str:
        if not text: return ""
        # Bỏ dấu câu ở cuối câu để tra cứu chính xác hơn (VD: "Hello?" -> "hello")
        text = text.strip().lower()
        if text and text[-1] in string.punctuation:
            text = text[:-1]
        return text

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
        Tách từ thông minh: Loại bỏ dấu câu dính liền để tăng khả năng hit cache.
        VD: "Hello, world!" -> ["Hello", "world"] (thay vì ["Hello,", "world!"])
        """
        if not text: return []
        
        # Với tiếng Trung/Nhật/Hàn -> tách từng ký tự (hoặc dùng thư viện chuyên dụng nếu cần)
        if lang in ['zh-CN', 'zh-TW', 'ja', 'ko', 'zh']:
            return [char for char in text if char.strip() and char not in string.punctuation]

        # Thay thế tất cả dấu câu bằng khoảng trắng, sau đó split
        translator = str.maketrans(string.punctuation, ' ' * len(string.punctuation))
        clean_text = text.translate(translator)
        return clean_text.split()

    async def _save_to_db(self, original_text: str, src_lang: str, target_lang: str, translated_text: str):
        """Lưu vào DB với xử lý lỗi dictionary update sequence"""
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                )
                result = await db.execute(stmt)
                lexicon_entry = result.scalar_one_or_none()

                if lexicon_entry:
                    # FIX: Xử lý an toàn cho trường JSON translations
                    current_translations = {}
                    if lexicon_entry.translations:
                        if isinstance(lexicon_entry.translations, dict):
                            current_translations = lexicon_entry.translations
                        elif isinstance(lexicon_entry.translations, str):
                            try:
                                current_translations = json.loads(lexicon_entry.translations)
                            except:
                                current_translations = {}
                    
                    # Cập nhật và gán lại bản sao dict mới
                    current_translations[target_lang] = translated_text
                    lexicon_entry.translations = dict(current_translations)
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
                # Log warning thay vì Error để tránh spam log
                logger.warning(f"⚠️ Background DB Save Skipped: {e}")
                await db.rollback()

    async def lpm_translate(self, text: str, src_lang: str, target_lang: str) -> Tuple[str, float]:
        # Sử dụng tokenizer mới đã lọc dấu câu
        words = self._tokenize(text, src_lang)
        
        n = len(words)
        if n == 0: return text, 0.0

        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            # Giới hạn window size hợp lý (8 từ)
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
                # Nếu không khớp, giữ nguyên từ gốc từ list words
                translated_chunks.append(words[i])
                i += 1
        
        # Ghép lại câu
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

        # 1. Try LPM (Fast Path)
        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        # Logic: Nếu coverage cao hoặc câu ngắn (dưới 5 từ) mà có match -> Dùng luôn
        word_count = len(text.split())
        threshold = 0.85 if word_count > 3 else 0.5 # Giảm ngưỡng cho câu ngắn
        
        if coverage >= threshold:
            return lpm_result, detected_lang

        if not GOOGLE_API_KEY:
            return lpm_result, detected_lang

        # 2. Call Gemini with Model Fallback
        target_lang_name = target_lang
        if target_lang == 'zh-CN': target_lang_name = "Simplified Chinese"
        elif target_lang == 'vi': target_lang_name = "Vietnamese"
        elif target_lang == 'en': target_lang_name = "English"

        prompt = (
            f"Translate from {detected_lang} to {target_lang_name}.\n"
            f"Text: {text}\n"
            "Output JSON: {\"translated_text\": \"...\", \"detected_source_lang\": \"...\"}"
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
                if json_match: raw = json_match.group(0)
                
                parsed = json.loads(raw)
                final_text = parsed.get("translated_text", "").strip()
                detected_from_model = parsed.get("detected_source_lang", detected_lang)
                
                if final_text:
                    # Cache kết quả Gemini vào Redis để lần sau không phải gọi lại
                    if word_count < 30: 
                        key = self._get_redis_key(detected_lang, text)
                        await self.redis.hset(key, mapping={target_lang: final_text})
                        await self.redis.expire(key, 86400 * 7) # 7 ngày
                        asyncio.create_task(self._save_to_db(text, detected_lang, target_lang, final_text))
                    
                    return final_text, detected_from_model
                
            except Exception as e:
                logger.warning(f"Fallback {current_model_name} failed: {e}")
                continue 

        logger.error(f"Translation Failed for '{text}': All tiers failed.")
        return lpm_result, detected_lang

_translator = None

def get_translator(redis_client: Redis) -> HybridTranslator:
    global _translator
    if _translator is None:
        _translator = HybridTranslator(redis_client)
    else:
        _translator.redis = redis_client
    return _translator