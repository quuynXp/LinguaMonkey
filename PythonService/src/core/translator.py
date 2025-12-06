# import os
# import json
# import logging
# import asyncio
# from langdetect import detect, LangDetectException
# from deep_translator import GoogleTranslator
# from google.generativeai import GenerativeModel
# import google.generativeai as genai
# from redis.asyncio import Redis
# from src.worker.tasks import sync_translation_to_db_task, update_usage_stats_task

# logger = logging.getLogger(__name__)

# # Config GenAI
# GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# if not GOOGLE_API_KEY:
#     logger.error("Missing GOOGLE_API_KEY")

# genai.configure(api_key=GOOGLE_API_KEY)
# # Sử dụng Flash 2.5 cho tốc độ cao hơn nếu có
# gemini_model = GenerativeModel('gemini-1.5-flash') 

# class HybridTranslator:
#     def __init__(self, redis_client: Redis):
#         self.redis = redis_client

#     def _normalize(self, text: str) -> str:
#         # Chuẩn hóa input để match key seeding
#         return text.strip().lower()

#     def _get_redis_key(self, lang: str, text: str) -> str:
#         # Key format: lex:vi:xin chào
#         return f"lex:{lang}:{self._normalize(text)}"

#     def detect_language(self, text: str) -> str:
#         try:
#             return detect(text)
#         except LangDetectException:
#             return "en"

#     async def lpm_translate(self, text: str, src_lang: str, target_lang: str):
#         """
#         Longest Phrase Matching: Only reads from Redis.
#         """
#         words = text.split()
#         n = len(words)
#         translated_chunks = []
#         i = 0
#         matched_words_count = 0

#         while i < n:
#             matched = False
#             # Max window size 8 words
#             max_window = min(n - i, 8)
            
#             for j in range(max_window, 0, -1):
#                 phrase = " ".join(words[i : i + j])
#                 key = self._get_redis_key(src_lang, phrase)
                
#                 # READ REDIS
#                 cached_data = await self.redis.get(key)
#                 if cached_data:
#                     try:
#                         data = json.loads(cached_data)
#                         if target_lang in data:
#                             logger.info(f"[CACHE HIT] Key: {key} -> {data[target_lang]}")
#                             translated_chunks.append(data[target_lang])
#                             matched_words_count += j
#                             i += j
#                             matched = True
#                             update_usage_stats_task.delay(phrase, src_lang)
#                             break
#                     except json.JSONDecodeError:
#                         logger.warning(f"Invalid JSON in Redis for key: {key}")
            
#             if not matched:
#                 logger.debug(f"[CACHE MISS] Phrase starting with: {words[i]}")
#                 translated_chunks.append(words[i])
#                 i += 1
        
#         return " ".join(translated_chunks), (matched_words_count / n if n > 0 else 0)

#     async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> tuple[str, str]:
#         """
#         Main Translation Entrypoint.
#         """
#         if not text or not text.strip(): return "", source_lang_hint

#         # 1. Detect Source Language (OPTIMIZED)
#         # Chỉ detect nếu hint là 'auto' hoặc rỗng. Nếu client đã gửi 'vi', dùng luôn 'vi' để tránh lag.
#         detected_lang = source_lang_hint
#         if not source_lang_hint or source_lang_hint == "auto":
#              # Chạy trong thread pool vì detect() là blocking
#             detected_lang = await asyncio.to_thread(self.detect_language, text)
        
#         # Mapping code language nếu cần (e.g., vn -> vi)
#         if detected_lang == 'vn': detected_lang = 'vi'
#         if detected_lang.startswith("zh"): detected_lang = "zh"

#         # 2. Optimization: Source == Target
#         if detected_lang == target_lang:
#             return text, detected_lang

#         # 3. Try LPM (Redis)
#         lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
#         # Nếu coverage 100% (hoặc > 80%), trả về ngay
#         if coverage >= 0.8:
#             return lpm_result, detected_lang
            
#         # 4. Fallback to External APIs (Cache Miss)
#         try:
#             logger.info(f"[EXTERNAL CALL] Redis miss (coverage {coverage}). Calling External API.")
#             final_text = ""
            
#             # Logic: Câu ngắn dùng Google Translate (DeepTranslator) - Nhanh hơn Gemini
#             if len(text.split()) < 15:
#                 final_text = await asyncio.to_thread(
#                     GoogleTranslator(source=detected_lang, target=target_lang).translate, 
#                     text
#                 )
#             else:
#                 prompt = f"Translate strictly from {detected_lang} to {target_lang}: {text}"
#                 response = await gemini_model.generate_content_async(prompt)
#                 final_text = response.text.strip()

#             if not final_text:
#                 return lpm_result, detected_lang 

#             # 5. WRITE BACK: Lưu vào DB và Redis cho lần sau
#             sync_translation_to_db_task.delay(
#                 original_text=text, 
#                 src_lang=detected_lang, 
#                 translations={target_lang: final_text}
#             )
            
#             # Update Redis nóng ngay lập tức
#             key = self._get_redis_key(detected_lang, text)
#             # Lấy data cũ nếu có để merge, không ghi đè mất ngôn ngữ khác
#             current_cache = await self.redis.get(key)
#             new_data = json.loads(current_cache) if current_cache else {}
#             new_data[target_lang] = final_text
            
#             # TTL 24h (86400s) cho cache nóng
#             await self.redis.set(key, json.dumps(new_data), ex=86400)

#             return final_text, detected_lang
            
#         except Exception as e:
#             logger.error(f"External Translation Failed: {e}")
#             # Nếu lỗi API, trả về kết quả LPM dù chưa hoàn hảo còn hơn lỗi
#             return lpm_result, detected_lang

# # Singleton Getter
# _translator = None
# def get_translator(redis_client: Redis) -> HybridTranslator:
#     global _translator
#     if not _translator:
#         _translator = HybridTranslator(redis_client)
#     # Cập nhật redis client mới nhất (đề phòng reconnect)
#     _translator.redis = redis_client
#     return _translator
import os
import json
import logging
import asyncio
from typing import Optional
from langdetect import detect, LangDetectException
from deep_translator import GoogleTranslator
from google.generativeai import GenerativeModel
import google.generativeai as genai
from redis.asyncio import Redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

# Imports từ project
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Config GenAI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("Missing GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
# Sử dụng Flash 2.5 cho tốc độ cao hơn
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
            return detect(text)
        except LangDetectException:
            return "en"

    async def _save_to_db(self, original_text: str, src_lang: str, target_lang: str, translated_text: str):
        """Hàm lưu trực tiếp vào DB thay vì dùng Celery task"""
        async with AsyncSessionLocal() as db:
            try:
                # Kiểm tra xem từ đã tồn tại chưa
                stmt = select(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                )
                result = await db.execute(stmt)
                lexicon_entry = result.scalar_one_or_none()

                if lexicon_entry:
                    # Update bản dịch mới vào JSONB
                    current_translations = dict(lexicon_entry.translations) if lexicon_entry.translations else {}
                    current_translations[target_lang] = translated_text
                    
                    lexicon_entry.translations = current_translations
                    lexicon_entry.usage_count += 1
                else:
                    # Tạo mới
                    new_entry = TranslationLexicon(
                        original_text=original_text,
                        original_lang=src_lang,
                        translations={target_lang: translated_text},
                        usage_count=1
                    )
                    db.add(new_entry)
                
                await db.commit()
                logger.info(f"✅ Saved translation to DB: {original_text} -> {translated_text}")
            except Exception as e:
                logger.error(f"❌ Failed to save translation to DB: {e}")
                await db.rollback()

    async def lpm_translate(self, text: str, src_lang: str, target_lang: str):
        """
        Longest Phrase Matching: Đọc từ Redis.
        """
        words = text.split()
        n = len(words)
        translated_chunks = []
        i = 0
        matched_words_count = 0

        while i < n:
            matched = False
            # Max window size 8 words
            max_window = min(n - i, 8)
            
            for j in range(max_window, 0, -1):
                phrase = " ".join(words[i : i + j])
                key = self._get_redis_key(src_lang, phrase)
                
                # READ REDIS
                cached_data = await self.redis.get(key)
                if cached_data:
                    try:
                        data = json.loads(cached_data)
                        if target_lang in data:
                            logger.info(f"[CACHE HIT] Key: {key} -> {data[target_lang]}")
                            translated_chunks.append(data[target_lang])
                            matched_words_count += j
                            i += j
                            matched = True
                            # Note: Usage stats update có thể để async background nếu cần
                            break
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in Redis for key: {key}")
            
            if not matched:
                # Nếu không match, giữ nguyên từ gốc
                translated_chunks.append(words[i])
                i += 1
        
        return " ".join(translated_chunks), (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> tuple[str, str]:
        """
        Main Translation Entrypoint.
        """
        if not text or not text.strip(): return "", source_lang_hint

        # 1. Detect Source Language
        detected_lang = source_lang_hint
        if not source_lang_hint or source_lang_hint == "auto":
            detected_lang = await asyncio.to_thread(self.detect_language, text)
        
        if detected_lang == 'vn': detected_lang = 'vi'
        if detected_lang.startswith("zh"): detected_lang = "zh"

        # 2. Optimization: Source == Target
        if detected_lang == target_lang:
            return text, detected_lang

        # 3. Try LPM (Redis)
        # Giảm ngưỡng coverage xuống 0.7 (70%) để tận dụng cache nhiều hơn
        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        if coverage >= 0.7:
            logger.info(f"Using Lexicon result (Coverage: {coverage:.2f})")
            return lpm_result, detected_lang
            
        # 4. Fallback to External APIs (Cache Miss)
        try:
            logger.info(f"[EXTERNAL CALL] Redis miss (coverage {coverage}). Calling External API.")
            final_text = ""
            
            # Logic: Câu ngắn dùng Google Translate (DeepTranslator) - Nhanh hơn
            if len(text.split()) < 15:
                final_text = await asyncio.to_thread(
                    GoogleTranslator(source=detected_lang, target=target_lang).translate, 
                    text
                )
            else:
                prompt = f"Translate strictly from {detected_lang} to {target_lang}: {text}"
                response = await gemini_model.generate_content_async(prompt)
                final_text = response.text.strip()

            if not final_text:
                return lpm_result, detected_lang 

            # 5. WRITE BACK: Lưu vào DB và Redis ngay lập tức
            # Lưu Redis
            key = self._get_redis_key(detected_lang, text)
            current_cache = await self.redis.get(key)
            new_data = json.loads(current_cache) if current_cache else {}
            new_data[target_lang] = final_text
            await self.redis.set(key, json.dumps(new_data), ex=86400) # 24h cache

            # Lưu DB (Python handle trực tiếp)
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