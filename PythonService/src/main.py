import base64
import json
import logging
import asyncio
import os
import uuid
import struct
import math
import binascii
import time
import re
import string
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Set, Any, Generic, TypeVar
from contextlib import asynccontextmanager

import uvicorn
from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, APIRouter, Query, BackgroundTasks
)
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv
from langdetect import detect, LangDetectException
import google.generativeai as genai
from google.generativeai import GenerativeModel

from src.core.models import ChatMessage, MessageType, TranslationLexicon, Room
from src.core.video_call_service import start_or_join_call, end_call_if_empty
from src.core.session import get_db, AsyncSessionLocal
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream, FALLBACK_MESSAGE
from src.api.tts_generator import generate_tts
from src.worker.tasks import ingest_huggingface_task
from src.worker.translation_consumer import run_translation_worker
from src.auth.auth_utils import verify_token_http, validate_websocket_token, security
from src.core.connection_manager import signal_manager, audio_manager, ConnectionManager
from src.core.azure_stt import AzureTranscriber 
from src.core.crypto_utils import aes_utils
from src.core.models import RoomPurpose

load_dotenv(find_dotenv())
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

AI_BOT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')

# Used only for direct translation endpoint, separate from Chat AI tiers
TRANSLATION_MODEL_TIERS = [
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Cost Effective"},
]

T = TypeVar("T")

class AppApiResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "Success"
    result: Optional[T] = None

class LexiconLiteSyncData(BaseModel):
    version: int
    total: int
    data: List[Dict[str, Any]]

class HybridTranslator:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        logger.info("HybridTranslator initialized.")

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
        if lang in ['en', 'english', 'en-us', 'en-uk']: return 'en'
        if lang in ['zh', 'chinese', 'zh-cn', 'cn', 'zh-tw']: return 'zh-CN'
        if lang in ['ja', 'japanese', 'jp']: return 'ja'
        if lang in ['ko', 'korean', 'kr']: return 'ko'
        return lang.split('-')[0] if '-' in lang else lang

    def detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "en"

    def _tokenize(self, text: str, lang: str) -> List[str]:
        if not text: return []
        if lang in ['zh-CN', 'zh-TW', 'ja', 'ko', 'zh']:
            return [char for char in text if char.strip() and char not in string.punctuation]
        clean_text = self._normalize(text)
        return clean_text.split()

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
                    raw_data = lexicon_entry.translations
                    current_translations = {}
                    if raw_data:
                        if isinstance(raw_data, dict):
                            current_translations = raw_data.copy()
                        elif isinstance(raw_data, str):
                            try: current_translations = json.loads(raw_data)
                            except: pass
                    
                    current_translations[target_lang] = translated_text
                    lexicon_entry.translations = current_translations
                    flag_modified(lexicon_entry, "translations") 
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
                    trans_text = cached_val.decode('utf-8') if isinstance(cached_val, bytes) else str(cached_val)
                    
                    if trans_text.strip().lower() == phrase.strip().lower() and src_lang != target_lang:
                        break

                    translated_chunks.append(trans_text)
                    
                    pipe = self.redis.pipeline()
                    pipe.hincrby(key, "usage", 1)
                    pipe.expire(key, 3600) 
                    asyncio.create_task(pipe.execute())
                    
                    matched_words_count += j
                    i += j
                    matched = True
                    break
            
            if not matched:
                translated_chunks.append(words[i])
                i += 1
        
        separator = "" if src_lang in ['zh-CN', 'zh-TW', 'ja', 'zh'] and target_lang in ['zh-CN', 'zh-TW', 'ja', 'zh'] else " "
        final_text = separator.join(translated_chunks)

        return final_text, (matched_words_count / n if n > 0 else 0)

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> Tuple[str, str]:
        if not text or not text.strip(): return "", source_lang_hint
        if text.strip().startswith('{') and '"ciphertext"' in text:
            return "", source_lang_hint

        src_lang = self._map_language_code(source_lang_hint)
        target_lang = self._map_language_code(target_lang)

        detected_lang = src_lang
        if detected_lang == "auto" or not detected_lang:
            detected_lang = await asyncio.to_thread(self.detect_language, text)
            detected_lang = self._map_language_code(detected_lang)

        if detected_lang == target_lang:
            return text, detected_lang

        lpm_result, coverage = await self.lpm_translate(text, detected_lang, target_lang)
        
        word_count = len(text.split())
        threshold = 0.8 if word_count > 3 else 0.99 
        
        is_poisoned = (lpm_result.strip().lower() == text.strip().lower()) and (detected_lang != target_lang)

        if coverage >= threshold and not is_poisoned:
            return lpm_result, detected_lang
        
        if not GOOGLE_API_KEY:
            return lpm_result, detected_lang

        target_lang_name = target_lang
        if target_lang == 'zh-CN': target_lang_name = "Simplified Chinese"
        elif target_lang == 'vi': target_lang_name = "Vietnamese"
        elif target_lang == 'ja': target_lang_name = "Japanese"
        elif target_lang == 'ko': target_lang_name = "Korean"

        prompt = (
            f"Translate the following text strictly from {detected_lang} to {target_lang_name}. "
            f"If the text makes no sense, return it as is. "
            f"Output ONLY valid JSON.\n\n"
            f"Text: \"{text}\"\n\n"
            f"JSON Format: {{\"translated_text\": \"YOUR_TRANSLATION_HERE\", \"detected_source_lang\": \"{detected_lang}\"}}"
        )

        for tier in TRANSLATION_MODEL_TIERS:
            try:
                model = GenerativeModel(
                    tier["name"],
                    generation_config={"temperature": 0.1, "max_output_tokens": 1024, "response_mime_type": "application/json"}
                )
                response = await model.generate_content_async(prompt)
                raw = response.text.strip()
                if raw.startswith("```json"): raw = raw[7:]
                if raw.endswith("```"): raw = raw[:-3]
                
                parsed = json.loads(raw)
                final_text = parsed.get("translated_text", "").strip()
                
                if final_text:
                    if final_text.lower() != text.lower():
                        if word_count < 30: 
                            key = self._get_redis_key(detected_lang, text)
                            await self.redis.hset(key, mapping={target_lang: final_text})
                            await self.redis.expire(key, 3600) 
                            asyncio.create_task(self._save_to_db(text, detected_lang, target_lang, final_text))
                    
                    return final_text, parsed.get("detected_source_lang", detected_lang)
            except Exception as e:
                logger.error(f"Gemini Error ({tier['name']}): {e}")
                continue 

        return lpm_result, detected_lang

_translator = None
def get_translator(redis_client: Redis) -> HybridTranslator:
    global _translator
    if _translator is None:
        _translator = HybridTranslator(redis_client)
    else:
        _translator.redis = redis_client
    return _translator

class ActiveSpeakerManager:
    def __init__(self, signal_manager: ConnectionManager):
        self.signal_manager = signal_manager
        self.speaker_status: Dict[str, str] = {} 
        self.last_speaker_change: Dict[str, float] = defaultdict(float)
        self.SPEECH_THRESHOLD = 500

    def _calculate_rms(self, pcm_data: bytes) -> float:
        try:
            format_str = f'<{len(pcm_data) // 2}h'
            audio_data = struct.unpack(format_str, pcm_data)
        except struct.error:
            return 0.0
        if not audio_data: return 0.0
        squared_sum = sum(sample * sample for sample in audio_data)
        return math.sqrt(squared_sum / len(audio_data))
        
    async def process_audio_chunk(self, room_id: str, user_id: str, pcm_data: bytes):
        rms = self._calculate_rms(pcm_data)
        if rms > self.SPEECH_THRESHOLD:
            current_time = time.time()
            current_speaker = self.speaker_status.get(room_id)
            if current_speaker != user_id:
                if current_time - self.last_speaker_change[room_id] > 1.0:
                    self.speaker_status[room_id] = user_id
                    self.last_speaker_change[room_id] = current_time
                    await self._notify_speaker_change(room_id, user_id)
            else:
                self.last_speaker_change[room_id] = current_time

    async def _notify_speaker_change(self, room_id: str, active_user_id: str):
        message = {
            "type": "active_speaker_update",
            "activeSpeakerId": active_user_id,
        }
        await self.signal_manager.broadcast_except(message, room_id, exclude_ws=None)

speaker_manager = ActiveSpeakerManager(signal_manager)
user_text_cache: Dict[str, str] = defaultdict(str)
user_last_speech_time: Dict[str, float] = defaultdict(float)
user_last_final_text: Dict[str, str] = defaultdict(str)
RESET_BUFFER_TIMEOUT = 3.0

class LexiconEntryResponse(BaseModel):
    original_text: str
    original_lang: str
    translations: Dict[str, str]
    usage_count: int

class CacheInvalidationRequest(BaseModel):
    user_id: str
    updated_table: str

class TranslationRequest(BaseModel):
    text: Optional[str] = None
    source_lang: str
    target_lang: str
    message_id: Optional[str] = None
    room_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: list[dict]

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = await get_redis_client()
    try:
        get_translator(redis)
        asyncio.create_task(run_translation_worker())
    except Exception as e:
        logger.error(f"Warmup error: {e}")
    yield
    await close_redis_client()

app = FastAPI(lifespan=lifespan)
internal_router = APIRouter(prefix="/internal")
protected_router = APIRouter(dependencies=[Depends(security)])


@protected_router.get("/lexicon/lite-sync", response_model=AppApiResponse[LexiconLiteSyncData])
async def get_lexicon_lite_sync(
    limit: int = Query(5000, ge=100, le=10000), 
    min_score: int = Query(100),
    db: AsyncSession = Depends(get_db)
):
    try:
        stmt = (
            select(TranslationLexicon)
            .where(TranslationLexicon.usage_count >= min_score)
            .order_by(TranslationLexicon.usage_count.desc())
            .limit(limit * 2) 
        )
        
        result = await db.execute(stmt)
        raw_entries = result.scalars().all()
        
        lite_entries = []
        count = 0
        
        for entry in raw_entries:
            if not entry.original_text: continue
            
            if len(entry.original_text.split()) > 6:
                continue
                
            lite_entries.append({
                "k": entry.original_text,
                "l": entry.original_lang,
                "t": entry.translations,
                "s": entry.usage_count
            })
            count += 1
            if count >= limit:
                break
        
        data_response = LexiconLiteSyncData(
            version=int(time.time()),
            total=len(lite_entries),
            data=lite_entries
        )
        
        return AppApiResponse(code=200, message="Success", result=data_response)

    except Exception as e:
        logger.error(f"Failed to sync lexicon lite: {e}")
        raise HTTPException(status_code=500, detail="Sync failed.")


@protected_router.get("/lexicon/top", response_model=AppApiResponse[List[LexiconEntryResponse]])
async def get_top_lexicon(limit: int = Query(200, ge=1, le=10000), db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(TranslationLexicon).order_by(TranslationLexicon.usage_count.desc()).limit(limit)
        result = await db.execute(stmt)
        lexicon_entries = result.scalars().all()
        response_data = [
            LexiconEntryResponse(
                original_text=entry.original_text,
                original_lang=entry.original_lang,
                translations=entry.translations if entry.translations else {},
                usage_count=entry.usage_count
            )
            for entry in lexicon_entries
        ]
        return AppApiResponse(code=200, message="Success", result=response_data)
    except Exception as e:
        logger.error(f"Failed to fetch lexicon: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve translation lexicon.")

@internal_router.post("/invalidate-cache")
async def invalidate_user_cache(request: CacheInvalidationRequest, redis: Redis = Depends(get_redis_client)):
    try:
        await redis.delete(f"user_profile:{request.user_id}")
        return {"status": "success"}
    except Exception:
        raise HTTPException(status_code=500, detail="Redis error")

@internal_router.post("/trigger-hf-ingest")
async def trigger_hf_ingest():
    task = ingest_huggingface_task.delay()
    return {"status": "Hugging Face ingestion task sent to worker", "task_id": str(task.id)}

@protected_router.post("/translate")
async def manual_translate(request: TranslationRequest, redis: Redis = Depends(get_redis_client), db: AsyncSession = Depends(get_db)):
    try:
        translator = get_translator(redis)
        translation_done = False
        translated_result = ""
        detected_language = ""

        if request.message_id and not request.text:
            try:
                msg_uuid = uuid.UUID(request.message_id)
                stmt = select(ChatMessage).where(ChatMessage.chat_message_id == msg_uuid)
                result = await db.execute(stmt)
                message = result.scalar_one_or_none()
                
                if message:
                    room_stmt = select(Room).where(Room.room_id == message.room_id)
                    room_res = await db.execute(room_stmt)
                    room = room_res.scalar_one_or_none()
                    
                    if room and room.secret_key:
                        decrypted_text = aes_utils.decrypt(message.content, room.secret_key)
                        if decrypted_text and "Decryption Failed" not in decrypted_text:
                            translated_text, detected_lang = await translator.translate(decrypted_text, request.source_lang, request.target_lang)
                            
                            encrypted_trans = aes_utils.encrypt(translated_text, room.secret_key)
                            
                            current_map = dict(message.translations) if message.translations else {}
                            current_map[request.target_lang] = encrypted_trans if encrypted_trans else translated_text
                            message.translations = current_map
                            flag_modified(message, "translations")
                            await db.commit()
                            
                            translated_result = translated_text
                            detected_language = detected_lang
                            translation_done = True
            except Exception as e:
                logger.warning(f"Server-side decryption/translation failed: {e}")

        if not translation_done:
            if request.text:
                translated_text, detected_lang = await translator.translate(request.text, request.source_lang, request.target_lang)
                translated_result = translated_text
                detected_language = detected_lang
                translation_done = True
                
                if request.message_id:
                    try:
                        msg_uuid = uuid.UUID(request.message_id)
                        stmt = select(ChatMessage).where(ChatMessage.chat_message_id == msg_uuid)
                        result = await db.execute(stmt)
                        message = result.scalar_one_or_none()
                        
                        if message:
                            room_stmt = select(Room).where(Room.room_id == message.room_id)
                            room_res = await db.execute(room_stmt)
                            room = room_res.scalar_one_or_none()
                            
                            encrypted_trans = aes_utils.encrypt(translated_text, room.secret_key) if room and room.secret_key else translated_text
                            
                            current_map = dict(message.translations) if message.translations else {}
                            current_map[request.target_lang] = encrypted_trans
                            message.translations = current_map
                            flag_modified(message, "translations")
                            await db.commit()
                    except Exception as save_err:
                        logger.error(f"Failed to persist client translation: {save_err}")
                        await db.rollback()
            else:
                raise HTTPException(status_code=400, detail="Text is required if server cannot decrypt message_id")

        return {"code": 200, "result": {"translated_text": translated_result, "detected_lang": detected_language}}
            
    except HTTPException as he:
        raise he
    except Exception as e: 
        logger.error(f"Translation API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@protected_router.post("/chat-ai")
async def chat_endpoint(
    request: ChatRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_token_http), 
    db: AsyncSession = Depends(get_db), 
    redis: Redis = Depends(get_redis_client)
):
    try:
        user_id = user.get("sub")
        user_profile = await get_user_profile(user_id, db, redis)
        
        response, error = await chat_with_ai(
            request.message, 
            request.history, 
            "en", 
            user_profile, 
            background_tasks=background_tasks,
            redis_client=redis
        )
        if error: raise HTTPException(status_code=500, detail=error)
        return {"reply": response}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@protected_router.post("/tts")
async def tts_endpoint(text: str, language: str, redis: Redis = Depends(get_redis_client)):
    audio_bytes, error = await generate_tts(text, language, redis)
    if error: raise HTTPException(status_code=500, detail=error)
    return {"audio_base64": base64.b64encode(audio_bytes).decode('utf-8')}

@app.websocket("/chat-stream")
async def chat_stream(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    user_id_str = await validate_websocket_token(websocket, token)
    if not user_id_str:
        await websocket.close(code=1008)
        return
    
    db_session = AsyncSessionLocal()
    redis = await get_redis_client()
    translator = get_translator(redis)
    
    try:
        user_profile = await get_user_profile(user_id_str, db_session, redis)
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")

                if msg_type == "chat_request":
                    raw_prompt = msg.get("prompt", "")
                    history = msg.get("history", [])
                    room_id_str = msg.get("roomId")
                    if not raw_prompt: continue
                    
                    try:
                        # 1. Save USER message to DB immediately
                        if room_id_str and user_id_str:
                            try:
                                user_msg_db = ChatMessage(
                                    chat_message_id=uuid.uuid4(),
                                    room_id=uuid.UUID(room_id_str),
                                    sender_id=uuid.UUID(user_id_str),
                                    content=raw_prompt,
                                    message_type=MessageType.TEXT if hasattr(MessageType, 'TEXT') else "TEXT",
                                    # Use timezone-aware UTC datetime
                                    sent_at=datetime.now(timezone.utc)
                                )
                                # Note: Assuming schema has a default for is_read or we set it
                                if hasattr(user_msg_db, 'is_read'): user_msg_db.is_read = True 
                                
                                db_session.add(user_msg_db)
                                await db_session.commit()
                            except Exception as db_err:
                                logger.error(f"Failed to save User Message to DB: {db_err}")
                                await db_session.rollback()

                        full_response = ""
                        async for chunk in chat_with_ai_stream(raw_prompt, history, user_profile, redis_client=redis):
                            full_response += chunk
                            await websocket.send_text(json.dumps({
                                "type": "chat_response_chunk", 
                                "content": chunk, 
                                "roomId": room_id_str
                            }))
                        
                        # 2. Save AI response to DB after streaming completes
                        if full_response and room_id_str:
                            try:
                                ai_msg_db = ChatMessage(
                                    chat_message_id=uuid.uuid4(),
                                    room_id=uuid.UUID(room_id_str),
                                    sender_id=AI_BOT_ID,
                                    content=full_response,
                                    message_type=MessageType.TEXT if hasattr(MessageType, 'TEXT') else "TEXT",
                                    sent_at=datetime.now(timezone.utc)
                                )
                                if hasattr(ai_msg_db, 'is_read'): ai_msg_db.is_read = False

                                db_session.add(ai_msg_db)
                                await db_session.commit()
                            except Exception as db_err:
                                logger.error(f"Failed to save AI Message to DB: {db_err}")
                                await db_session.rollback()

                    except Exception as stream_err:
                        logger.error(f"Stream generation crashed: {stream_err}")
                        await websocket.send_text(json.dumps({
                            "type": "chat_response_chunk", 
                            "content": FALLBACK_MESSAGE, 
                            "roomId": room_id_str
                        }))
                    finally:
                        await websocket.send_text(json.dumps({"type": "chat_response_complete", "roomId": room_id_str}))

                elif msg_type == "translate_request":
                    text = msg.get("text", "")
                    message_id = msg.get("messageId")
                    target_lang = msg.get("targetLang", "vi")
                    source_lang = msg.get("sourceLang", "auto")
                    room_id = msg.get("roomId")
                    
                    if text:
                        translated, detected = await translator.translate(text, source_lang, target_lang)
                        
                        response_payload = {
                            "type": "translation_result",
                            "messageId": message_id,
                            "originalText": text,
                            "translatedText": translated,
                            "targetLang": target_lang,
                            "detectedLang": detected,
                            "roomId": room_id
                        }
                        await websocket.send_text(json.dumps(response_payload))
                        
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.error(f"WS Process Error: {e}")

    except WebSocketDisconnect: pass
    except Exception as e: logger.error(f"Chat WS Error: {e}")
    finally: await db_session.close()

@app.websocket("/subtitles-audio")
async def audio_endpoint(websocket: WebSocket, token: str = Query(...), roomId: str = Query(...), nativeLang: str = Query(None)):
    normalized_room_id = str(roomId).strip().lower()
    user_id = await validate_websocket_token(websocket, token)
    if not user_id: await websocket.close(code=1008); return

    await audio_manager.connect(websocket, normalized_room_id, user_id=user_id, native_lang=nativeLang)
    buffer_key = f"{normalized_room_id}_{user_id}"
    loop = asyncio.get_running_loop()
    
    redis = await get_redis_client()
    translator = get_translator(redis)

    async def handle_interim_async(text: str, detected_lang_code: str):
        if len(text) > 1:
            await audio_manager.broadcast_subtitle(
                original_full=text, 
                detected_lang=detected_lang_code, 
                room_id=normalized_room_id, 
                sender_id=user_id, 
                is_final=False
            )

    async def handle_final_async(text: str, detected_lang_code: str):
        try:
            clean_text = text.strip()
            if not clean_text: return
            
            last_text = user_last_final_text[buffer_key]
            if clean_text.lower() == last_text.lower(): return
            user_last_final_text[buffer_key] = clean_text 

            current_time = time.time()
            if user_last_speech_time[buffer_key] > 0 and (current_time - user_last_speech_time[buffer_key]) > RESET_BUFFER_TIMEOUT:
                user_text_cache[buffer_key] = ""
            user_last_speech_time[buffer_key] = current_time
            previous_text = user_text_cache[buffer_key]
            
            if previous_text and not previous_text.endswith(('.', '?', '!', '。')):
                new_full = (previous_text + " " + clean_text).strip()
            else:
                new_full = clean_text
            
            user_text_cache[buffer_key] = new_full
            if clean_text.endswith(('.', '?', '!', '。')) or len(new_full) > 200: 
                user_text_cache[buffer_key] = ""

            needed_langs = audio_manager.get_required_languages(normalized_room_id)
            src_lang_simple = detected_lang_code.split('-')[0].lower()
            
            target_langs = []
            for lang in needed_langs:
                if lang != src_lang_simple:
                    target_langs.append(lang)

            translations_map = {}
            if target_langs:
                tasks = []
                for target in target_langs:
                    tasks.append(translator.translate(clean_text, detected_lang_code, target))
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for idx, target in enumerate(target_langs):
                    res = results[idx]
                    if isinstance(res, tuple):
                        translations_map[target] = res[0]

            await audio_manager.broadcast_subtitle(
                original_full=clean_text, 
                detected_lang=detected_lang_code, 
                room_id=normalized_room_id, 
                sender_id=user_id, 
                is_final=True,
                translations=translations_map 
            )
        except Exception as e: logger.error(f"Handle final error: {e}")

    def handle_interim_sync(text: str, lang: str): asyncio.run_coroutine_threadsafe(handle_interim_async(text, lang), loop)
    def handle_final_sync(text: str, lang: str): asyncio.run_coroutine_threadsafe(handle_final_async(text, lang), loop)

    transcriber = AzureTranscriber(callback_final=handle_final_sync, callback_interim=handle_interim_sync, candidate_languages=["vi-VN", "en-US", "zh-CN", "ja-JP"])
    transcriber.start()

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                msg_json = json.loads(data_str)
                if "config" in msg_json:
                    connections = audio_manager.active_connections[normalized_room_id]
                    for meta in connections:
                        if str(meta["user_id"]) == str(user_id):
                            meta["config"] = msg_json["config"]
                            if "nativeLang" in msg_json: 
                                meta["native_lang"] = str(msg_json["nativeLang"]).split('-')[0].lower()
                            break
                    continue

                b64_audio = msg_json.get("audio")
                if b64_audio:
                    pcm_data = binascii.a2b_base64(b64_audio)
                    transcriber.write_stream(pcm_data)
                    await speaker_manager.process_audio_chunk(normalized_room_id, user_id, pcm_data)

            except Exception: continue
    except WebSocketDisconnect:
        audio_manager.disconnect(websocket, normalized_room_id)
    except Exception as e:
        logger.error(f"Audio WS Error: {e}")
        audio_manager.disconnect(websocket, normalized_room_id)
    finally:
        transcriber.stop()

@app.websocket("/signal")
async def signaling_endpoint(websocket: WebSocket, token: str = Query(...), roomId: str = Query(...)):
    normalized_room_id = str(roomId).strip().lower()
    user_id = await validate_websocket_token(websocket, token)
    if not user_id: await websocket.close(code=1008); return

    await signal_manager.connect(websocket, normalized_room_id, user_id=user_id)
    async with AsyncSessionLocal() as db_session:
        await start_or_join_call(db_session, normalized_room_id, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") in ["webrtc_signal", "JOIN_ROOM", "offer", "answer", "ice_candidate", "REACTION"]:
                msg["senderId"] = user_id
                if msg.get("type") == "JOIN_ROOM":
                    join_msg = {"type": "webrtc_signal", "senderId": user_id, "payload": {"type": "JOIN_ROOM"}}
                    await signal_manager.broadcast_except(join_msg, normalized_room_id, websocket)
                    await signal_manager.broadcast_except({"type": "JOIN_ROOM", "senderId": user_id}, normalized_room_id, websocket)
                else:
                    await signal_manager.broadcast_except(msg, normalized_room_id, websocket)
                    
    except WebSocketDisconnect:
        signal_manager.disconnect(websocket, normalized_room_id)
        
        await signal_manager.broadcast_except(
            {"type": "USER_LEFT", "senderId": user_id}, 
            normalized_room_id, 
            None
        )
        
        remaining_users = signal_manager.get_remaining_users(normalized_room_id)
        count = len(remaining_users)
        
        if count == 1:
            last_user_id = remaining_users[0]
            if str(last_user_id) != str(user_id):
                logger.info(f"Room {normalized_room_id} only has {last_user_id}. Sending FORCE_LEAVE.")
                await signal_manager.send_to_user(
                    {"type": "FORCE_LEAVE", "reason": "ALONE"}, 
                    normalized_room_id, 
                    last_user_id
                )
            
        if count == 0:
            async with AsyncSessionLocal() as db_session:
                await end_call_if_empty(db_session, normalized_room_id)
                
    except Exception as e:
        logger.error(f"Signal Error: {e}")
        signal_manager.disconnect(websocket, normalized_room_id)

app.include_router(internal_router)
app.include_router(protected_router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, workers=1)