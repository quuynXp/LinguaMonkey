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
from google.api_core.exceptions import ResourceExhausted, NotFound, PermissionDenied
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified  # <--- QUAN TRỌNG ĐỂ FIX LỖI DB JSON
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
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Cost Effective"},
]

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        logger.info("HybridTranslator initialized.")

    def _normalize(self, text: str) -> str:
        if not text: return ""
        # Bỏ dấu câu và đưa về chữ thường
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
        if lang in ['ja', 'japanese', 'jp']: return 'ja'
        return lang

    def detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "en"

    def _tokenize(self, text: str, lang: str) -> List[str]:
        if not text: return []
        # Xử lý tiếng Trung/Nhật
        if lang in ['zh-CN', 'zh-TW', 'ja', 'ko', 'zh']:
            return [char for char in text if char.strip() and char not in string.punctuation]
        
        # Tiếng Anh/Việt: Thay thế dấu câu bằng khoảng trắng rồi split
        translator = str.maketrans(string.punctuation, ' ' * len(string.punctuation))
        clean_text = text.translate(translator)
        return clean_text.split()

    async def _save_to_db(self, original_text: str, src_lang: str, target_lang: str, translated_text: str):
        """
        Lưu vào DB. FIX LỖI: Luôn tạo ra một dict mới (copy) để tránh lỗi reference của SQLAlchemy.
        """
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                )
                result = await db.execute(stmt)
                lexicon_entry = result.scalar_one_or_none()

                if lexicon_entry:
                    # --- BẮT ĐẦU FIX ---
                    raw_data = lexicon_entry.translations
                    
                    # 1. Luôn đưa về dict thuần của Python (tránh None hoặc String)
                    current_translations = {}
                    
                    if raw_data:
                        if isinstance(raw_data, dict):
                            current_translations = raw_data.copy()  # <--- QUAN TRỌNG: .copy() để tách khỏi session state
                        elif isinstance(raw_data, str):
                            try:
                                current_translations = json.loads(raw_data)
                            except json.JSONDecodeError:
                                current_translations = {}
                    
                    # 2. Update vào dict mới
                    current_translations[target_lang] = translated_text
                    
                    # 3. Gán lại dict mới hoàn toàn vào model
                    lexicon_entry.translations = current_translations
                    
                    # 4. Báo hiệu thay đổi
                    flag_modified(lexicon_entry, "translations") 
                    
                    lexicon_entry.usage_count += 1
                    # --- KẾT THÚC FIX ---
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
                logger.error(f"⚠️ DB Save Error: {e}")
                await db.rollback()
                
    async def lpm_translate(self, text: str, src_lang: str, target_lang: str) -> Tuple[str, float]:
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
                if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh']:
                    phrase = "".join(words[i : i + j])
                else:
                    phrase = " ".join(words[i : i + j])

                key = self._get_redis_key(src_lang, phrase)
                cached_val = await self.redis.hget(key, target_lang)
                
                if cached_val:
                    # Parse Redis value
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
                # Debug log: Tại sao không bắt được từ này?
                if n < 5: # Chỉ log với câu ngắn để tránh spam
                    phrase_debug = " ".join(words[i : i + 1])
                    key_debug = self._get_redis_key(src_lang, phrase_debug)
                    # logger.info(f"MISS CACHE: '{phrase_debug}' (Key: {key_debug})")
                
                translated_chunks.append(words[i])
                i += 1
        
        separator = "" if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh'] and target_lang in ['zh-CN', 'zh-TW', 'ja', 'zh'] else " "
        final_text = separator.join(translated_chunks)

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

        # 1. LPM Translation
        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        # Nếu coverage 100% hoặc câu rất ngắn (dưới 5 từ) mà đã dịch được -> Return luôn
        word_count = len(text.split())
        threshold = 0.8 if word_count > 3 else 0.4 
        
        # DEBUG: Nếu là từ "Hi", coverage phải là 1.0 (1/1 từ). Nếu không, nghĩa là Redis chưa có.
        if coverage >= threshold:
            logger.info(f"⚡ LPM HIT ({int(coverage*100)}%): '{text}' -> '{lpm_result}'")
            return lpm_result, detected_lang
        
        if not GOOGLE_API_KEY:
            return lpm_result, detected_lang

        # 2. Gemini Fallback
        target_lang_name = target_lang
        if target_lang == 'zh-CN': target_lang_name = "Simplified Chinese"
        elif target_lang == 'vi': target_lang_name = "Vietnamese"
        elif target_lang == 'en': target_lang_name = "English"

        prompt = (
            f"Translate '{text}' from {detected_lang} to {target_lang_name}.\n"
            "Return JSON: {\"translated_text\": \"...\", \"detected_source_lang\": \"...\"}"
        )

        for tier in TRANSLATION_MODEL_TIERS:
            try:
                model = GenerativeModel(
                    tier["name"],
                    generation_config={"temperature": 0.1, "max_output_tokens": 1024, "response_mime_type": "application/json"}
                )
                response = await model.generate_content_async(prompt)
                raw = response.text.strip()
                json_match = re.search(r'\{.*\}', raw, re.DOTALL)
                if json_match: raw = json_match.group(0)
                parsed = json.loads(raw)
                final_text = parsed.get("translated_text", "").strip()
                
                if final_text:
                    # Cache kết quả Gemini vào Redis để lần sau không bị lỗi nữa
                    if word_count < 30: 
                        key = self._get_redis_key(detected_lang, text)
                        await self.redis.hset(key, mapping={target_lang: final_text})
                        await self.redis.expire(key, 86400 * 7)
                        asyncio.create_task(self._save_to_db(text, detected_lang, target_lang, final_text))
                    
                    return final_text, parsed.get("detected_source_lang", detected_lang)
            except ResourceExhausted:
                logger.warning(f"Rate limit hit for {tier['name']}. Trying next...")
                continue
            except Exception as e:
                logger.error(f"Fallback error {tier['name']}: {e}")
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