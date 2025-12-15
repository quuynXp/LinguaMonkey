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
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

import uvicorn
from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, APIRouter, Query
)
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv

from src.core.models import ChatMessage, MessageType, TranslationLexicon
from src.core.video_call_service import start_or_join_call, end_call_if_empty
from src.core.session import get_db, AsyncSessionLocal
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
from src.api.tts_generator import generate_tts
from src.core.translator import get_translator
from src.worker.tasks import ingest_huggingface_task
from src.auth.auth_utils import verify_token_http, validate_websocket_token, security
from src.core.connection_manager import signal_manager, audio_manager, ConnectionManager
from src.core.azure_stt import AzureTranscriber 

load_dotenv(find_dotenv())
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AI_BOT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')

# --- ACTIVE SPEAKER DETECTION LOGIC ---
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
                # Debounce: only change speaker if > 1s since last change to avoid flickering
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
    text: str
    source_lang: str
    target_lang: str
    message_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: list[dict]

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = await get_redis_client()
    try:
        get_translator(redis)
    except Exception as e:
        logger.error(f"Warmup error: {e}")
    yield
    await close_redis_client()

app = FastAPI(lifespan=lifespan)
internal_router = APIRouter(prefix="/internal")
protected_router = APIRouter(dependencies=[Depends(security)])

@protected_router.get("/lexicon/top")
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
        return {"code": 200, "result": response_data}
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
        translated_text, detected_lang = await translator.translate(request.text, request.source_lang, request.target_lang)
        if request.message_id:
            try:
                msg_uuid = uuid.UUID(request.message_id)
                stmt = select(ChatMessage).where(ChatMessage.chat_message_id == msg_uuid)
                result = await db.execute(stmt)
                message = result.scalar_one_or_none()
                if message:
                    current_map = dict(message.translations) if message.translations else {}
                    current_map[request.target_lang] = translated_text
                    message.translations = current_map
                    flag_modified(message, "translations")
                    await db.commit()
            except Exception: await db.rollback()
        return {"code": 200, "result": {"translated_text": translated_text, "detected_lang": detected_lang}}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@protected_router.post("/chat-ai")
async def chat_endpoint(request: ChatRequest, user: dict = Depends(verify_token_http), db: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis_client)):
    try:
        user_id = user.get("sub")
        user_profile = await get_user_profile(user_id, db, redis)
        response, error = await chat_with_ai(request.message, request.history, "en", user_profile)
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
    try:
        user_profile = await get_user_profile(user_id_str, db_session, redis)
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "chat_request":
                raw_prompt = msg.get("prompt", "")
                history = msg.get("history", [])
                room_id_str = msg.get("roomId")
                if not raw_prompt: continue
                
                async for chunk in chat_with_ai_stream(raw_prompt, history, user_profile):
                      await websocket.send_text(json.dumps({
                        "type": "chat_response_chunk", "content": chunk, "roomId": room_id_str
                    }))
                await websocket.send_text(json.dumps({"type": "chat_response_complete", "roomId": room_id_str}))

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

            await audio_manager.broadcast_subtitle(
                original_full=clean_text, 
                detected_lang=detected_lang_code, 
                room_id=normalized_room_id, 
                sender_id=user_id, 
                is_final=True
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
                            if "nativeLang" in msg_json: meta["native_lang"] = msg_json["nativeLang"]
                            break
                    continue

                b64_audio = msg_json.get("audio")
                if b64_audio:
                    pcm_data = binascii.a2b_base64(b64_audio)
                    transcriber.write_stream(pcm_data)
                    # --- ACTIVE SPEAKER CHECK ---
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
            if msg.get("type") in ["webrtc_signal", "JOIN_ROOM", "offer", "answer", "ice_candidate"]:
                msg["senderId"] = user_id
                if msg.get("type") == "JOIN_ROOM":
                    join_msg = {"type": "webrtc_signal", "senderId": user_id, "payload": {"type": "JOIN_ROOM"}}
                    await signal_manager.broadcast_except(join_msg, normalized_room_id, websocket)
                else:
                    await signal_manager.broadcast_except(msg, normalized_room_id, websocket)
                    
    except WebSocketDisconnect:
        signal_manager.disconnect(websocket, normalized_room_id)
        remaining_users = signal_manager.get_participant_count(normalized_room_id)
        if remaining_users == 0:
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