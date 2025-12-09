import base64
import json
import logging
import jwt
import asyncio
import os
import uuid
import struct
import io
import wave
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional
from contextlib import asynccontextmanager
from asyncio import Queue, Semaphore
import uvicorn
import webrtcvad

from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, APIRouter, Query
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv, find_dotenv
from redis.asyncio import Redis

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

MIN_BUFFER_SIZE_TO_PROCESS = 3200
MAX_TEXT_CACHE_LENGTH = 300
VAD_MODE = 2
FRAME_DURATION_MS = 20
SAMPLE_RATE = 16000
FRAME_SIZE_BYTES = int(SAMPLE_RATE * FRAME_DURATION_MS / 1000) * 2

vad = webrtcvad.Vad(VAD_MODE)
process_semaphore = Semaphore(3)

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

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, native_lang: str = "vi"):
        await websocket.accept()
        meta = {
            "ws": websocket,
            "user_id": user_id,
            "native_lang": native_lang
        }
        self.active_connections[room_id].append(meta)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                m for m in self.active_connections[room_id] if m["ws"] != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_signal(self, message: dict, room_id: str, exclude_ws: WebSocket = None):
        if room_id not in self.active_connections: return
        data = json.dumps(message)
        to_remove = []
        for meta in self.active_connections[room_id]:
            conn = meta["ws"]
            if conn is exclude_ws: continue
            try:
                await conn.send_text(data)
            except Exception:
                to_remove.append(meta)
        
        for dead in to_remove:
            self.disconnect(dead["ws"], room_id)

    async def broadcast_subtitle(self, message: dict, room_id: str, exclude_user_id: str = None):
        if room_id not in self.active_connections: return
        
        to_remove = []
        original_lang = message.get("originalLang", "en").lower()
        
        for meta in self.active_connections[room_id]:
            if meta["user_id"] == exclude_user_id: continue
            
            conn = meta["ws"]
            recipient_native = meta.get("native_lang", "vi").lower()
            
            payload = dict(message)
            if recipient_native.startswith(original_lang):
                payload["translated"] = "" 
            
            try:
                await conn.send_text(json.dumps(payload))
            except Exception:
                to_remove.append(meta)
                
        for dead in to_remove:
            self.disconnect(dead["ws"], room_id)

manager = ConnectionManager()
user_text_cache: Dict[str, str] = defaultdict(str)

def create_wav_bytes(pcm_data: bytes, sample_rate=16000, channels=1, sampwidth=2) -> bytes:
    io_buf = io.BytesIO()
    with wave.open(io_buf, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(sampwidth)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm_data)
    return io_buf.getvalue()

def split_by_script_and_punctuation(text: str) -> List[str]:
    import regex as re
    parts = []
    buf = ""
    last_kind = None
    for ch in text:
        if '\u4e00' <= ch <= '\u9fff' or '\u3400' <= ch <= '\u4dbf': kind = 'cjk'
        elif ch.isspace() or re.match(r'[.,!?;:]', ch): kind = 'punct'
        else: kind = 'latin'
        
        if last_kind is None:
            buf = ch
            last_kind = kind
        elif kind == last_kind:
            buf += ch
        else:
            parts.append(buf)
            buf = ch
            last_kind = kind
    if buf: parts.append(buf)
    return parts

def frame_generator(audio_bytes: bytes):
    offset = 0
    while offset + FRAME_SIZE_BYTES <= len(audio_bytes):
        yield audio_bytes[offset:offset + FRAME_SIZE_BYTES]
        offset += FRAME_SIZE_BYTES

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = await get_redis_client()
    try:
        get_translator(redis)
    except Exception:
        pass
    yield
    await close_redis_client()

app = FastAPI(lifespan=lifespan)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if not PUBLIC_KEY else {"verify_exp": True}
        return jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
    if not token: return None
    try:
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if not PUBLIC_KEY else {"verify_exp": True, "verify_aud": False, "verify_iss": True}
        decoded = jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
        return decoded.get("sub")
    except Exception:
        return None

@internal_router.post("/invalidate-cache")
async def invalidate_user_cache(request: CacheInvalidationRequest, redis: Redis = Depends(get_redis_client)):
    await redis.delete(f"user_profile:{request.user_id}")
    return {"status": "success"}

@internal_router.post("/trigger-hf-ingest")
async def trigger_hf_ingest():
    task = ingest_huggingface_task.delay()
    return {"status": "task_sent", "task_id": str(task.id)}

@protected_router.post("/translate")
async def translate(request: TranslationRequest, redis: Redis = Depends(get_redis_client)):
    translator = get_translator(redis)
    res, lang = await translator.translate(request.text, request.source_lang, request.target_lang)
    return {"code": 200, "result": {"translated_text": res, "detected_lang": lang}}

@protected_router.post("/chat-ai")
async def chat(request: ChatRequest, user: dict = Depends(verify_token), db: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis_client)):
    user_id = user.get("sub")
    profile = await get_user_profile(user_id, db, redis)
    res, err = await chat_with_ai(request.message, request.history, "en", profile)
    if err: raise HTTPException(status_code=500, detail=err)
    return {"reply": res}

@app.websocket("/signal")
async def signal_endpoint(websocket: WebSocket, token: str = Query(...), roomId: str = Query(...)):
    user_id = await validate_websocket_token(websocket, token)
    if not user_id:
        await websocket.close(code=1008)
        return
    
    room_id = str(roomId).strip().lower()
    await manager.connect(websocket, room_id, user_id, "vi") 

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "webrtc_signal":
                msg["senderId"] = user_id
                await manager.broadcast_signal(msg, room_id, exclude_ws=websocket)
            elif msg_type == "JOIN_ROOM":
                join_msg = {"type": "webrtc_signal", "senderId": user_id, "payload": {"type": "JOIN_ROOM"}}
                await manager.broadcast_signal(join_msg, room_id, exclude_ws=websocket)
            elif msg_type == "PING":
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        logger.error(f"Signal WS Error: {e}")
        manager.disconnect(websocket, room_id)

@app.websocket("/subtitles-audio")
async def subtitles_audio_endpoint(
    websocket: WebSocket, 
    token: str = Query(...), 
    roomId: str = Query(...), 
    nativeLang: str = Query("vi"), 
    spokenLang: str = Query("auto")
):
    user_id = await validate_websocket_token(websocket, token)
    if not user_id:
        await websocket.close(code=1008)
        return

    room_id = str(roomId).strip().lower()
    await manager.connect(websocket, room_id, user_id, nativeLang)

    redis = await get_redis_client()
    translator = get_translator(redis)
    buffer_key = f"{room_id}_{user_id}"
    audio_queue = Queue()

    async def process_buffer_logic(pcm_bytes: bytes, cache_text: str):
        async with process_semaphore:
            wav_data = create_wav_bytes(pcm_bytes)
            stt_text, detected_lang, _ = await asyncio.to_thread(speech_to_text, wav_data, spokenLang)

            clean = stt_text.strip().lower() if stt_text else ""
            if not clean or clean in HALLUCINATION_FILTERS or len(clean) < 2:
                return

            if len(clean.split()) < 3: detected_lang = spokenLang
            
            new_full = (cache_text + " " + stt_text.strip()) if cache_text else stt_text.strip()
            user_text_cache[buffer_key] = new_full

            await manager.broadcast_subtitle({
                "type": "subtitle",
                "status": "processing",
                "original": stt_text.strip(),
                "originalFull": new_full,
                "originalLang": detected_lang,
                "translated": "",
                "senderId": user_id
            }, room_id, exclude_user_id=user_id)

            parts = split_by_script_and_punctuation(new_full)
            trans_parts = []
            for p in parts:
                t_res, _ = await translator.translate(p, detected_lang, nativeLang)
                trans_parts.append(t_res)
            
            final_trans = "".join(trans_parts)

            await manager.broadcast_subtitle({
                "type": "subtitle",
                "status": "complete",
                "original": stt_text.strip(),
                "originalFull": new_full,
                "originalLang": detected_lang,
                "translated": final_trans,
                "senderId": user_id
            }, room_id, exclude_user_id=user_id)

            if any(x in stt_text for x in ".?!") or len(new_full) > 150:
                user_text_cache[buffer_key] = ""

    async def vad_worker():
        frames = []
        silence_frames = 0
        is_speech_mode = False
        
        while True:
            chunk = await audio_queue.get()
            if chunk is None: break

            for frame in frame_generator(chunk):
                is_speech = vad.is_speech(frame, SAMPLE_RATE)
                
                if is_speech:
                    is_speech_mode = True
                    frames.append(frame)
                    silence_frames = 0
                else:
                    if is_speech_mode:
                        frames.append(frame)
                        silence_frames += 1
                        if silence_frames > 15: 
                            full_bytes = b"".join(frames)
                            if len(full_bytes) > MIN_BUFFER_SIZE_TO_PROCESS:
                                asyncio.create_task(process_buffer_logic(full_bytes, user_text_cache[buffer_key]))
                            frames = []
                            is_speech_mode = False
                            silence_frames = 0

    worker = asyncio.create_task(vad_worker())

    try:
        while True:
            msg = await websocket.receive()
            if "bytes" in msg and msg["bytes"]:
                await audio_queue.put(msg["bytes"])
            elif "text" in msg:
                 # Handle pure text/meta if needed
                 pass
    except Exception:
        manager.disconnect(websocket, room_id)
    finally:
        await audio_queue.put(None)
        await worker
        if buffer_key in user_text_cache: del user_text_cache[buffer_key]

app.include_router(protected_router, tags=["Protected"])
app.include_router(internal_router, tags=["Internal"])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, workers=1, proxy_headers=True, forwarded_allow_ips="*")