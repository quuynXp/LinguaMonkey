import base64
import json
import logging
import jwt
import asyncio
import os
import uuid
import struct
import math
import io
import wave
import webrtcvad
import regex as re
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional
from contextlib import asynccontextmanager
from asyncio import Queue, Semaphore
import uvicorn

from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, APIRouter, Query
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv, find_dotenv
from redis.asyncio import Redis
from src.core.azure_stt import AzureTranscriber
from src.core.session import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile
from src.core.models import ChatMessage, MessageType
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
from src.api.speech_to_text import speech_to_text
from src.api.tts_generator import generate_tts
from src.core.translator import get_translator
from src.worker.tasks import ingest_huggingface_task

load_dotenv(find_dotenv())
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AI_BOT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')

SILENCE_THRESHOLD = 60
MIN_BUFFER_SIZE_TO_PROCESS = 3200 
MAX_TEXT_CACHE_LENGTH = 300

VAD = webrtcvad.Vad(2)
PROCESS_SEMAPHORE = Semaphore(3)

HALLUCINATION_FILTERS = [
    "you", "you.", "you?", "thank you", "thank you.", "bye", "bye.", 
    "i", "subtitles by", "watched", "watching", ".", "?", "!", "", 
    "vietsub", "copyright"
]

security = HTTPBearer()
PUBLIC_KEY = None

try:
    with open("public_key.pem", "rb") as f:
        PUBLIC_KEY = serialization.load_pem_public_key(
            f.read(), backend=default_backend()
        )
    logger.info("Public key loaded successfully.")
except Exception as e:
    logger.critical(f"Could not load public_key.pem: {e}")

internal_router = APIRouter(prefix="/internal")
protected_router = APIRouter(dependencies=[Depends(security)])

class CacheInvalidationRequest(BaseModel):
    user_id: str
    updated_table: str

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class ChatRequest(BaseModel):
    message: str
    history: list[dict]

class ConnectionManager:
    def __init__(self):
        self.active_connections = defaultdict(list)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None, native_lang: str = None):
        await websocket.accept()
        meta = {"ws": websocket, "user_id": user_id, "native_lang": (native_lang or "vi")}
        self.active_connections[room_id].append(meta)
        logger.info(f"✅ WS CONNECTED: Room={room_id} | User={user_id} | Total={len(self.active_connections[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            to_remove = [m for m in self.active_connections[room_id] if m["ws"] is websocket]
            for m in to_remove:
                self.active_connections[room_id].remove(m)
            logger.info(f"❌ WS DISCONNECTED: Room={room_id}")
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_except(self, message: dict, room_id: str, exclude_ws: WebSocket):
        if room_id in self.active_connections:
            data = json.dumps(message)
            to_remove = []
            for meta in self.active_connections[room_id]:
                conn = meta["ws"]
                if conn is exclude_ws:
                    continue
                try:
                    await conn.send_text(data)
                except Exception as e:
                    logger.error(f"⚠️ Broadcast fail, removing stale connection: {e}")
                    to_remove.append(meta)
            for dead in to_remove:
                self.disconnect(dead["ws"], room_id)

    # FIX: Updated signature to handle exclude_user_id cleanly
    async def broadcast_subtitle(self, message: dict, room_id: str, exclude_user_id: str = None):
        if room_id not in self.active_connections: return
        to_remove = []
        
        for meta in self.active_connections[room_id]:
            conn = meta["ws"]
            uid = str(meta.get("user_id"))
            
            # If exclude_user_id is provided and matches, skip
            if exclude_user_id and uid == str(exclude_user_id):
                continue
            
            try:
                user_native = meta.get("native_lang", "vi")
                payload = dict(message)
                
                # Logic: Don't translate if original lang matches user native lang
                if user_native and payload.get("originalLang") and user_native.lower().startswith(payload["originalLang"].lower()):
                    payload["translated"] = ""
                
                await conn.send_text(json.dumps(payload))
            except Exception as e:
                logger.error(f"⚠️ Broadcast_subtitle fail, removing stale connection: {e}")
                to_remove.append(meta)
        
        for dead in to_remove:
            self.disconnect(dead["ws"], room_id)

# Separate managers for Signal and Audio to avoid cross-talk
signal_manager = ConnectionManager()
audio_manager = ConnectionManager()

user_text_cache: Dict[str, str] = defaultdict(str)

def frame_bytes_from_pcm(pcm_bytes: bytes, sample_rate=16000, frame_ms=20):
    samples = int(sample_rate * frame_ms / 1000)
    bytes_per_frame = samples * 2
    for i in range(0, len(pcm_bytes), bytes_per_frame):
        yield pcm_bytes[i:i+bytes_per_frame]

def create_wav_bytes(pcm_data: bytes, sample_rate=16000, channels=1, sampwidth=2) -> bytes:
    io_buf = io.BytesIO()
    with wave.open(io_buf, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(sampwidth)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm_data)
    return io_buf.getvalue()

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = await get_redis_client()
    logger.info("Redis client initialized.")
    try:
        get_translator(redis)
        logger.info("Translator singleton initialized & warmed up.")
    except Exception as e:
        logger.error(f"Translator warmup warning: {e}")
    yield
    await close_redis_client()
    logger.info("Redis client closed.")

app = FastAPI(lifespan=lifespan)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        if not PUBLIC_KEY:
            return jwt.decode(token, options={"verify_signature": False})
        return jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=["RS256"],
            issuer="LinguaMonkey.com",
            options={"verify_exp": True, "verify_aud": False}
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
    if not token:
        return None
    try:
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {
            "verify_exp": True, "verify_aud": False, "verify_iss": True
        }
        decoded_token = jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
        return decoded_token.get("sub")
    except Exception as e:
        logger.warning(f"WS Auth failed: {e}")
        return None

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
async def translate(request: TranslationRequest, redis: Redis = Depends(get_redis_client)):
    try:
        translator = get_translator(redis)
        translated_text, detected_lang = await translator.translate(request.text, request.source_lang, request.target_lang)
        return {"code": 200, "result": {"translated_text": translated_text, "detected_lang": detected_lang}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@protected_router.post("/chat-ai")
async def chat(
    request: ChatRequest,
    user: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_client)
):
    try:
        user_id = user.get("sub")
        user_profile = await get_user_profile(user_id, db, redis)
        response, error = await chat_with_ai(request.message, request.history, "en", user_profile)
        if error: raise HTTPException(status_code=500, detail=error)
        return {"reply": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@protected_router.post("/tts")
async def text_to_speech_endpoint(text: str, language: str, redis: Redis = Depends(get_redis_client)):
    audio_bytes, error = await generate_tts(text, language, redis)
    if error: raise HTTPException(status_code=500, detail=error)
    return {"audio_base64": base64.b64encode(audio_bytes).decode('utf-8')}

@app.websocket("/voice")
async def voice_stream(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    user_id = await validate_websocket_token(websocket, token)
    if not user_id:
        await websocket.close(code=1008)
        return
    try:
        while True:
            data = await websocket.receive()
            msg = json.loads(data)
            audio_chunk = base64.b64decode(msg.get("audio_chunk", "")) if msg.get("audio_chunk") else b""
            if audio_chunk:
                wav_data = create_wav_bytes(audio_chunk)
                text, detected_lang, error = await asyncio.to_thread(speech_to_text, wav_data, "en")
                
                response = {"seq": msg.get("seq", 0)}
                if error: response["error"] = error
                else: response["text"] = text
                await websocket.send_text(json.dumps(response))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Voice WS Error: {e}")

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
                if not room_id_str or not raw_prompt: continue
                
                try:
                    room_uuid = uuid.UUID(room_id_str)
                    user_uuid = uuid.UUID(user_id_str)
                    user_msg_db = ChatMessage(chat_message_id=uuid.uuid4(), content=raw_prompt, room_id=room_uuid, sender_id=user_uuid, message_type=MessageType.TEXT.value, sent_at=datetime.utcnow())
                    db_session.add(user_msg_db)
                    await db_session.commit()
                except Exception:
                    await db_session.rollback()

                full_ai_response = ""
                async for chunk in chat_with_ai_stream(raw_prompt, history, user_profile):
                    full_ai_response += chunk
                    await websocket.send_text(json.dumps({"type": "chat_response_chunk", "content": chunk, "roomId": room_id_str}))
                await websocket.send_text(json.dumps({"type": "chat_response_complete", "roomId": room_id_str}))
                
                if full_ai_response.strip():
                    try:
                        ai_msg_db = ChatMessage(chat_message_id=uuid.uuid4(), content=full_ai_response, room_id=room_uuid, sender_id=AI_BOT_ID, message_type=MessageType.TEXT.value, sent_at=datetime.utcnow())
                        db_session.add(ai_msg_db)
                        await db_session.commit()
                    except Exception:
                        await db_session.rollback()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Chat WS Error: {e}")
    finally:
        await db_session.close()

@app.websocket("/signal")
async def signaling_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    roomId: str = Query(...)
):
    normalized_room_id = str(roomId).strip().lower()
    user_id = await validate_websocket_token(websocket, token)
    if not user_id:
        await websocket.close(code=1008)
        return

    await signal_manager.connect(websocket, normalized_room_id, user_id=user_id)
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
    except Exception as e:
        logger.error(f"Signaling Error: {e}")
        signal_manager.disconnect(websocket, normalized_room_id)

@app.websocket("/subtitles-audio")
async def audio_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    roomId: str = Query(...),
    nativeLang: str = Query(None),
    spokenLang: str = Query(None)
):
    normalized_room_id = str(roomId).strip().lower()
    user_id = await validate_websocket_token(websocket, token)
    if not user_id:
        await websocket.close(code=1008)
        return

    await audio_manager.connect(websocket, normalized_room_id, user_id=user_id, native_lang=nativeLang)
    
    redis = await get_redis_client()
    translator = get_translator(redis)
    buffer_key = f"{normalized_room_id}_{user_id}"

    user_native_lang = nativeLang or "vi"
    target_spoken_lang = "en-US" if (not spokenLang or spokenLang == 'en') else "vi-VN" 
    if spokenLang == 'vi': target_spoken_lang = 'vi-VN'

    # --- CALLBACKS XỬ LÝ KẾT QUẢ TỪ AZURE ---

    async def handle_interim_result(text: str):
        # FIX: Send to EVERYONE (including self) so I can see "Processing..."
        # This confirms mic is working.
        await audio_manager.broadcast_subtitle({
            "type": "subtitle",
            "status": "processing",
            "original": text,
            "originalFull": user_text_cache[buffer_key] + " " + text,
            "originalLang": spokenLang,
            "translated": "",
            "senderId": user_id
        }, normalized_room_id, exclude_user_id=None) 

    async def handle_final_result(text: str):
        try:
            clean_text = text.strip()
            if not clean_text: return

            current_full = user_text_cache[buffer_key]
            new_full = (current_full + " " + clean_text).strip()
            user_text_cache[buffer_key] = new_full

            if len(new_full) > 200: 
                user_text_cache[buffer_key] = ""

            # Broadcast status processing final time
            await audio_manager.broadcast_subtitle({
                "type": "subtitle",
                "status": "processing",
                "original": clean_text,
                "originalFull": new_full,
                "originalLang": spokenLang,
                "translated": "...",
                "senderId": user_id
            }, normalized_room_id, exclude_user_id=None)

            # Translation
            translated_text, _ = await translator.translate(clean_text, spokenLang, user_native_lang)
            
            # Broadcast COMPLETE to EVERYONE
            await audio_manager.broadcast_subtitle({
                "type": "subtitle",
                "status": "complete",
                "original": clean_text,
                "originalFull": new_full,
                "originalLang": spokenLang,
                "translated": translated_text,
                "senderId": user_id
            }, normalized_room_id, exclude_user_id=None)
            
        except Exception as e:
            logger.error(f"Translation logic error: {e}")

    # --- KHỞI TẠO AZURE STREAMING ---
    azure_lang_code = "vi-VN" if "vi" in str(spokenLang) else "en-US"
    
    transcriber = AzureTranscriber(
        callback_final=handle_final_result,
        callback_interim=handle_interim_result,
        language=azure_lang_code
    )
    
    transcriber.start()
    logger.info(f"🎙️ Azure Stream Started for User {user_id} [{azure_lang_code}]")

    try:
        while True:
            msg = await websocket.receive()
            
            if "bytes" in msg and msg["bytes"]:
                transcriber.write_stream(msg["bytes"])
                
            elif "text" in msg:
                pass
                
    except WebSocketDisconnect:
        audio_manager.disconnect(websocket, normalized_room_id)
    except Exception as e:
        logger.error(f"Audio Error: {e}")
        audio_manager.disconnect(websocket, normalized_room_id)
    finally:
        transcriber.stop()
        logger.info(f"🛑 Azure Stream Stopped for User {user_id}")

app.include_router(protected_router, tags=["Protected API"])
app.include_router(internal_router, tags=["Internal API"])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, workers=1, proxy_headers=True, forwarded_allow_ips="*")