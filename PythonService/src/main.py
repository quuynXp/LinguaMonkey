# import base64
# import json
# import logging
# import jwt
# import asyncio
# import os
# import uuid
# import struct
# import math
# import io
# import wave
# import time
# import webrtcvad
# import regex as re
# from datetime import datetime
# from collections import defaultdict
# from typing import Dict, List, Optional
# from contextlib import asynccontextmanager
# from asyncio import Queue, Semaphore
# import uvicorn

# from fastapi import (
#     FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, APIRouter, Query
# )
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from pydantic import BaseModel
# from cryptography.hazmat.primitives import serialization
# from cryptography.hazmat.backends import default_backend
# from dotenv import load_dotenv, find_dotenv
# from redis.asyncio import Redis
# from sqlalchemy import select
# from sqlalchemy.orm.attributes import flag_modified
# from src.core.azure_stt import AzureTranscriber
# from src.core.session import get_db, AsyncSessionLocal
# from sqlalchemy.ext.asyncio import AsyncSession
# from src.core.cache import get_redis_client, close_redis_client
# from src.core.user_profile_service import get_user_profile
# from src.core.models import ChatMessage, MessageType
# from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
# from src.api.speech_to_text import speech_to_text
# from src.api.tts_generator import generate_tts
# from src.core.translator import get_translator
# from src.worker.tasks import ingest_huggingface_task

# load_dotenv(find_dotenv())
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# VOLUME_GAIN_FACTOR = 2.5  # Phóng to âm lượng lên 2.5 lần
# MAX_INT16 = 32767
# MIN_INT16 = -32768
# AI_BOT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')
# RESET_BUFFER_TIMEOUT = 2.5 

# security = HTTPBearer()
# PUBLIC_KEY = None

# try:
#     with open("public_key.pem", "rb") as f:
#         PUBLIC_KEY = serialization.load_pem_public_key(
#             f.read(), backend=default_backend()
#         )
#     logger.info("Public key loaded successfully.")
# except Exception as e:
#     logger.critical(f"Could not load public_key.pem: {e}")

# internal_router = APIRouter(prefix="/internal")
# protected_router = APIRouter(dependencies=[Depends(security)])

# class CacheInvalidationRequest(BaseModel):
#     user_id: str
#     updated_table: str

# class TranslationRequest(BaseModel):
#     text: str
#     source_lang: str
#     target_lang: str
#     message_id: Optional[str] = None

# class ChatRequest(BaseModel):
#     message: str
#     history: list[dict]

# class ConnectionManager:
#     def __init__(self):
#         self.active_connections = defaultdict(list)

#     async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None, native_lang: str = None):
#         await websocket.accept()
#         meta = {"ws": websocket, "user_id": user_id, "native_lang": (native_lang or "vi")}
#         self.active_connections[room_id].append(meta)
#         logger.info(f"✅ WS CONNECTED: Room={room_id} | User={user_id} | Total={len(self.active_connections[room_id])}")

#     def disconnect(self, websocket: WebSocket, room_id: str):
#         if room_id in self.active_connections:
#             to_remove = [m for m in self.active_connections[room_id] if m["ws"] is websocket]
#             for m in to_remove:
#                 self.active_connections[room_id].remove(m)
#             logger.info(f"❌ WS DISCONNECTED: Room={room_id}")
#             if not self.active_connections[room_id]:
#                 del self.active_connections[room_id]

#     async def broadcast_except(self, message: dict, room_id: str, exclude_ws: WebSocket):
#         if room_id in self.active_connections:
#             data = json.dumps(message)
#             to_remove = []
#             for meta in self.active_connections[room_id]:
#                 conn = meta["ws"]
#                 if conn is exclude_ws:
#                     continue
#                 try:
#                     await conn.send_text(data)
#                 except Exception as e:
#                     logger.error(f"⚠️ Broadcast fail, removing stale connection: {e}")
#                     to_remove.append(meta)
#             for dead in to_remove:
#                 self.disconnect(dead["ws"], room_id)

#     async def broadcast_subtitle(self, message: dict, room_id: str, exclude_user_id: str = None):
#         if room_id not in self.active_connections: return
#         to_remove = []
        
#         for meta in self.active_connections[room_id]:
#             conn = meta["ws"]
#             uid = str(meta.get("user_id"))
            
#             if exclude_user_id and uid == str(exclude_user_id):
#                 continue
            
#             try:
#                 user_native = meta.get("native_lang", "vi")
#                 payload = dict(message)
                
#                 # Check based on detected language from payload
#                 if user_native and payload.get("originalLang"):
#                      if payload["originalLang"].lower().startswith(user_native.lower()):
#                         payload["translated"] = ""
                
#                 await conn.send_text(json.dumps(payload))
#             except Exception as e:
#                 logger.error(f"⚠️ Broadcast_subtitle fail, removing stale connection: {e}")
#                 to_remove.append(meta)
        
#         for dead in to_remove:
#             self.disconnect(dead["ws"], room_id)

# signal_manager = ConnectionManager()
# audio_manager = ConnectionManager()

# user_text_cache: Dict[str, str] = defaultdict(str)
# user_last_speech_time: Dict[str, float] = defaultdict(float)

# def create_wav_bytes(pcm_data: bytes, sample_rate=16000, channels=1, sampwidth=2) -> bytes:
#     io_buf = io.BytesIO()
#     with wave.open(io_buf, "wb") as wav:
#         wav.setnchannels(channels)
#         wav.setsampwidth(sampwidth)
#         wav.setframerate(sample_rate)
#         wav.writeframes(pcm_data)
#     return io_buf.getvalue()

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     redis = await get_redis_client()
#     try:
#         get_translator(redis)
#     except Exception as e:
#         logger.error(f"Translator warmup warning: {e}")
#     yield
#     await close_redis_client()

# app = FastAPI(lifespan=lifespan)

# async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
#     try:
#         token = credentials.credentials
#         if not PUBLIC_KEY:
#             return jwt.decode(token, options={"verify_signature": False})
#         return jwt.decode(
#             token,
#             PUBLIC_KEY,
#             algorithms=["RS256"],
#             issuer="LinguaMonkey.com",
#             options={"verify_exp": True, "verify_aud": False}
#         )
#     except Exception:
#         raise HTTPException(status_code=401, detail="Invalid token")

# async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
#     if not token:
#         return None
#     try:
#         key = PUBLIC_KEY if PUBLIC_KEY else ""
#         options = {"verify_signature": False} if PUBLIC_KEY is None else {
#             "verify_exp": True, "verify_aud": False, "verify_iss": True
#         }
#         decoded_token = jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
#         return decoded_token.get("sub")
#     except Exception as e:
#         logger.warning(f"WS Auth failed: {e}")
#         return None

# @internal_router.post("/invalidate-cache")
# async def invalidate_user_cache(request: CacheInvalidationRequest, redis: Redis = Depends(get_redis_client)):
#     try:
#         await redis.delete(f"user_profile:{request.user_id}")
#         return {"status": "success"}
#     except Exception:
#         raise HTTPException(status_code=500, detail="Redis error")

# @internal_router.post("/trigger-hf-ingest")
# async def trigger_hf_ingest():
#     task = ingest_huggingface_task.delay()
#     return {"status": "Hugging Face ingestion task sent to worker", "task_id": str(task.id)}

# @protected_router.post("/translate")
# async def translate(
#     request: TranslationRequest, 
#     redis: Redis = Depends(get_redis_client),
#     db: AsyncSession = Depends(get_db)
# ):
#     try:
#         translator = get_translator(redis)
#         translated_text, detected_lang = await translator.translate(request.text, request.source_lang, request.target_lang)
        
#         if request.message_id:
#             try:
#                 msg_uuid = uuid.UUID(request.message_id)
#                 stmt = select(ChatMessage).where(ChatMessage.chat_message_id == msg_uuid)
#                 result = await db.execute(stmt)
#                 message = result.scalar_one_or_none()
                
#                 if message:
#                     current_map = dict(message.translations) if message.translations else {}
#                     current_map[request.target_lang] = translated_text
#                     message.translations = current_map
#                     flag_modified(message, "translations")
#                     await db.commit()
#             except Exception as e:
#                 logger.error(f"Failed to save translation to DB: {e}")
#                 await db.rollback()

#         return {"code": 200, "result": {"translated_text": translated_text, "detected_lang": detected_lang}}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @protected_router.post("/chat-ai")
# async def chat(
#     request: ChatRequest,
#     user: dict = Depends(verify_token),
#     db: AsyncSession = Depends(get_db),
#     redis: Redis = Depends(get_redis_client)
# ):
#     try:
#         user_id = user.get("sub")
#         user_profile = await get_user_profile(user_id, db, redis)
#         response, error = await chat_with_ai(request.message, request.history, "en", user_profile)
#         if error: raise HTTPException(status_code=500, detail=error)
#         return {"reply": response}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @protected_router.post("/tts")
# async def text_to_speech_endpoint(text: str, language: str, redis: Redis = Depends(get_redis_client)):
#     audio_bytes, error = await generate_tts(text, language, redis)
#     if error: raise HTTPException(status_code=500, detail=error)
#     return {"audio_base64": base64.b64encode(audio_bytes).decode('utf-8')}

# @app.websocket("/voice")
# async def voice_stream(websocket: WebSocket, token: str = Query(...)):
#     await websocket.accept()
#     user_id = await validate_websocket_token(websocket, token)
#     if not user_id:
#         await websocket.close(code=1008)
#         return
#     try:
#         while True:
#             data = await websocket.receive()
#             msg = json.loads(data)
#             audio_chunk = base64.b64decode(msg.get("audio_chunk", "")) if msg.get("audio_chunk") else b""
#             if audio_chunk:
#                 wav_data = create_wav_bytes(audio_chunk)
#                 text, detected_lang, error = await asyncio.to_thread(speech_to_text, wav_data, "en")
                
#                 response = {"seq": msg.get("seq", 0)}
#                 if error: response["error"] = error
#                 else: response["text"] = text
#                 await websocket.send_text(json.dumps(response))
#     except WebSocketDisconnect:
#         pass
#     except Exception as e:
#         logger.error(f"Voice WS Error: {e}")

# @app.websocket("/chat-stream")
# async def chat_stream(websocket: WebSocket, token: str = Query(...)):
#     await websocket.accept()
#     user_id_str = await validate_websocket_token(websocket, token)
#     if not user_id_str:
#         await websocket.close(code=1008)
#         return

#     db_session = AsyncSessionLocal()
#     redis = await get_redis_client()
#     try:
#         user_profile = await get_user_profile(user_id_str, db_session, redis)
#         while True:
#             data = await websocket.receive_text()
#             msg = json.loads(data)
#             if msg.get("type") == "chat_request":
#                 raw_prompt = msg.get("prompt", "")
#                 history = msg.get("history", [])
#                 room_id_str = msg.get("roomId")
#                 if not room_id_str or not raw_prompt: continue
                
#                 try:
#                     room_uuid = uuid.UUID(room_id_str)
#                     user_uuid = uuid.UUID(user_id_str)
#                     user_msg_db = ChatMessage(chat_message_id=uuid.uuid4(), content=raw_prompt, room_id=room_uuid, sender_id=user_uuid, message_type=MessageType.TEXT.value, sent_at=datetime.utcnow())
#                     db_session.add(user_msg_db)
#                     await db_session.commit()
#                 except Exception:
#                     await db_session.rollback()

#                 full_ai_response = ""
#                 async for chunk in chat_with_ai_stream(raw_prompt, history, user_profile):
#                     full_ai_response += chunk
#                     await websocket.send_text(json.dumps({"type": "chat_response_chunk", "content": chunk, "roomId": room_id_str}))
#                 await websocket.send_text(json.dumps({"type": "chat_response_complete", "roomId": room_id_str}))
                
#                 if full_ai_response.strip():
#                     try:
#                         ai_msg_db = ChatMessage(chat_message_id=uuid.uuid4(), content=full_ai_response, room_id=room_uuid, sender_id=AI_BOT_ID, message_type=MessageType.TEXT.value, sent_at=datetime.utcnow())
#                         db_session.add(ai_msg_db)
#                         await db_session.commit()
#                     except Exception:
#                         await db_session.rollback()
#     except WebSocketDisconnect:
#         pass
#     except Exception as e:
#         logger.error(f"Chat WS Error: {e}")
#     finally:
#         await db_session.close()

# @app.websocket("/signal")
# async def signaling_endpoint(
#     websocket: WebSocket,
#     token: str = Query(...),
#     roomId: str = Query(...)
# ):
#     normalized_room_id = str(roomId).strip().lower()
#     user_id = await validate_websocket_token(websocket, token)
#     if not user_id:
#         await websocket.close(code=1008)
#         return

#     await signal_manager.connect(websocket, normalized_room_id, user_id=user_id)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             msg = json.loads(data)
            
#             if msg.get("type") in ["webrtc_signal", "JOIN_ROOM", "offer", "answer", "ice_candidate"]:
#                 msg["senderId"] = user_id
#                 if msg.get("type") == "JOIN_ROOM":
#                     join_msg = {"type": "webrtc_signal", "senderId": user_id, "payload": {"type": "JOIN_ROOM"}}
#                     await signal_manager.broadcast_except(join_msg, normalized_room_id, websocket)
#                 else:
#                     await signal_manager.broadcast_except(msg, normalized_room_id, websocket)
                
#     except WebSocketDisconnect:
#         signal_manager.disconnect(websocket, normalized_room_id)
#     except Exception as e:
#         logger.error(f"Signaling Error: {e}")
#         signal_manager.disconnect(websocket, normalized_room_id)

# @app.websocket("/subtitles-audio")
# async def audio_endpoint(
#     websocket: WebSocket,
#     token: str = Query(...),
#     roomId: str = Query(...),
#     nativeLang: str = Query(None)
# ):
#     normalized_room_id = str(roomId).strip().lower()
#     user_id = await validate_websocket_token(websocket, token)
#     if not user_id:
#         await websocket.close(code=1008)
#         return

#     await audio_manager.connect(websocket, normalized_room_id, user_id=user_id, native_lang=nativeLang)
    
#     redis = await get_redis_client()
#     translator = get_translator(redis)
#     buffer_key = f"{normalized_room_id}_{user_id}"

#     user_native_lang = nativeLang or "vi"
    
#     async def handle_interim_result(text: str, detected_lang_code: str):
#         await audio_manager.broadcast_subtitle({
#             "type": "subtitle",
#             "status": "processing",
#             "original": text,
#             "originalFull": user_text_cache[buffer_key] + " " + text,
#             "originalLang": detected_lang_code,
#             "translated": "",
#             "senderId": user_id
#         }, normalized_room_id, exclude_user_id=None) 

#     async def handle_final_result(text: str, detected_lang_code: str):
#         try:
#             clean_text = text.strip()
#             if not clean_text: return

#             current_time = time.time()
#             last_speech = user_last_speech_time[buffer_key]
            
#             if last_speech > 0 and (current_time - last_speech) > RESET_BUFFER_TIMEOUT:
#                 user_text_cache[buffer_key] = ""
            
#             user_last_speech_time[buffer_key] = current_time
#             current_full = user_text_cache[buffer_key]
#             new_full = (current_full + " " + clean_text).strip()
#             user_text_cache[buffer_key] = new_full

#             if len(new_full) > 300: 
#                 user_text_cache[buffer_key] = ""

#             await audio_manager.broadcast_subtitle({
#                 "type": "subtitle",
#                 "status": "processing",
#                 "original": clean_text,
#                 "originalFull": new_full,
#                 "originalLang": detected_lang_code,
#                 "translated": "...",
#                 "senderId": user_id
#             }, normalized_room_id, exclude_user_id=None)

#             translated_text, _ = await translator.translate(clean_text, detected_lang_code, user_native_lang)
            
#             await audio_manager.broadcast_subtitle({
#                 "type": "subtitle",
#                 "status": "complete",
#                 "original": clean_text,
#                 "originalFull": new_full,
#                 "originalLang": detected_lang_code,
#                 "translated": translated_text,
#                 "senderId": user_id
#             }, normalized_room_id, exclude_user_id=None)
            
#         except Exception as e:
#             logger.error(f"Translation logic error: {e}")

#     # FIX: Limit to 4 languages as per Azure Error 1007
#     transcriber = AzureTranscriber(
#         callback_final=handle_final_result,
#         callback_interim=handle_interim_result,
#         candidate_languages=["vi-VN", "en-US", "zh-CN", "ja-JP"]
#     )
    
#     transcriber.start()
#     logger.info(f"🎙️ Azure Auto-Detect Stream Started for User {user_id}")

#     try:
#         while True:
#             msg = await websocket.receive()
#             if "bytes" in msg and msg["bytes"]:
#                 transcriber.write_stream(msg["bytes"])
#             elif "text" in msg:
#                 pass     
#     except WebSocketDisconnect:
#         audio_manager.disconnect(websocket, normalized_room_id)
#     except Exception as e:
#         logger.error(f"Audio Error: {e}")
#         audio_manager.disconnect(websocket, normalized_room_id)
#     finally:
#         transcriber.stop()
#         logger.info(f"🛑 Azure Stream Stopped for User {user_id}")

# app.include_router(protected_router, tags=["Protected API"])
# app.include_router(internal_router, tags=["Internal API"])

# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", 10000))
#     uvicorn.run("src.main:app", host="0.0.0.0", port=port, workers=1, proxy_headers=True, forwarded_allow_ips="*")
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
import time
import webrtcvad  # Thư viện C-based VAD cực nhanh
import binascii   # Decode base64 nhanh hơn base64.b64decode thường
import regex as re
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional
from contextlib import asynccontextmanager
from asyncio import Queue, Semaphore
import numpy as np
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
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
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

# --- CONSTANTS & CONFIG ---
VOLUME_GAIN_FACTOR = 2.5
MAX_INT16 = 32767
MIN_INT16 = -32768
AI_BOT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')
RESET_BUFFER_TIMEOUT = 2.5 

# Khởi tạo VAD (Mode 3: Aggressive filtering - Lọc nhiễu mạnh nhất)
vad = webrtcvad.Vad(3)

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

# --- MODELS ---
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

# --- CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections = defaultdict(list)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None, native_lang: str = None):
        await websocket.accept()
        meta = {"ws": websocket, "user_id": user_id, "native_lang": (native_lang or "vi")}
        self.active_connections[room_id].append(meta)
        logger.info(f"✅ WS CONNECTED: Room={room_id} | User={user_id}")

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
                if conn is exclude_ws: continue
                try:
                    await conn.send_text(data)
                except Exception as e:
                    to_remove.append(meta)
            for dead in to_remove:
                self.disconnect(dead["ws"], room_id)

    async def broadcast_subtitle(self, message: dict, room_id: str, exclude_user_id: str = None):
        if room_id not in self.active_connections: return
        to_remove = []
        
        for meta in self.active_connections[room_id]:
            conn = meta["ws"]
            uid = str(meta.get("user_id"))
            
            if exclude_user_id and uid == str(exclude_user_id): continue
            
            try:
                user_native = meta.get("native_lang", "vi")
                payload = dict(message)
                # Client-side optimization: Don't send translated if same language
                if user_native and payload.get("originalLang"):
                     if payload["originalLang"].lower().startswith(user_native.lower()):
                        payload["translated"] = ""
                
                await conn.send_text(json.dumps(payload))
            except Exception as e:
                to_remove.append(meta)
        
        for dead in to_remove:
            self.disconnect(dead["ws"], room_id)

signal_manager = ConnectionManager()
audio_manager = ConnectionManager()

user_text_cache: Dict[str, str] = defaultdict(str)
user_last_speech_time: Dict[str, float] = defaultdict(float)

# --- HELPER FUNCTIONS ---

def amplify_audio(pcm_data: bytes) -> bytes:
    """Numpy Optimized Amplification"""
    try:
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)
        amplified = audio_array * VOLUME_GAIN_FACTOR
        amplified = np.clip(amplified, MIN_INT16, MAX_INT16)
        return amplified.astype(np.int16).tobytes()
    except Exception:
        return pcm_data

def check_voice_activity(pcm_data: bytes, sample_rate=16000) -> bool:
    """
    Hybrid VAD: Ưu tiên dùng WebRTC VAD (C-based), fallback về Energy (RMS) nếu frame size không chuẩn.
    """
    # WebRTC VAD chỉ hỗ trợ frame 10, 20, 30ms. Tại 16kHz: 320, 640, 960 bytes.
    # Buffer từ client thường là 2048 hoặc 4096 bytes.
    try:
        # Cắt lấy 30ms (960 bytes) đầu tiên để check nhanh
        chk_len = 960 
        if len(pcm_data) >= chk_len:
            return vad.is_speech(pcm_data[:chk_len], sample_rate)
        
        # Nếu data quá ngắn hoặc không khớp frame chuẩn, fallback về RMS (cũng nhanh với numpy)
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)
        rms = np.sqrt(np.mean(audio_array**2))
        return rms > 500  # Threshold im lặng
    except Exception:
        return True # An toàn: mặc định là có tiếng nếu lỗi check

def create_wav_bytes(pcm_data: bytes, sample_rate=16000) -> bytes:
    io_buf = io.BytesIO()
    with wave.open(io_buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm_data)
    return io_buf.getvalue()

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

# --- AUTH HELPER ---
async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
    if not token: return None
    try:
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {"verify_exp": True, "verify_aud": False}
        decoded_token = jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
        return decoded_token.get("sub")
    except Exception:
        return None

# --- WEBSOCKET ENDPOINTS ---

@app.websocket("/subtitles-audio")
async def audio_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    roomId: str = Query(...),
    nativeLang: str = Query(None)
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
    
    # Callback xử lý kết quả nhận dạng (Giữ nguyên logic dịch của bạn)
    async def handle_interim_result(text: str, detected_lang_code: str):
        await audio_manager.broadcast_subtitle({
            "type": "subtitle", "status": "processing",
            "original": text, "originalFull": user_text_cache[buffer_key] + " " + text,
            "originalLang": detected_lang_code, "translated": "", "senderId": user_id
        }, normalized_room_id)

    async def handle_final_result(text: str, detected_lang_code: str):
        try:
            clean_text = text.strip()
            if not clean_text: return
            
            current_time = time.time()
            if user_last_speech_time[buffer_key] > 0 and (current_time - user_last_speech_time[buffer_key]) > RESET_BUFFER_TIMEOUT:
                user_text_cache[buffer_key] = ""
            
            user_last_speech_time[buffer_key] = current_time
            new_full = (user_text_cache[buffer_key] + " " + clean_text).strip()
            user_text_cache[buffer_key] = new_full if len(new_full) <= 300 else "" # Reset nếu quá dài

            # Gửi final gốc trước để hiện ngay
            await audio_manager.broadcast_subtitle({
                "type": "subtitle", "status": "processing",
                "original": clean_text, "originalFull": new_full,
                "originalLang": detected_lang_code, "translated": "...", "senderId": user_id
            }, normalized_room_id)

            # Dịch song song
            translated_text, _ = await translator.translate(clean_text, detected_lang_code, user_native_lang)
            
            await audio_manager.broadcast_subtitle({
                "type": "subtitle", "status": "complete",
                "original": clean_text, "originalFull": new_full,
                "originalLang": detected_lang_code, "translated": translated_text, "senderId": user_id
            }, normalized_room_id)
        except Exception as e:
            logger.error(f"Translation logic error: {e}")

    transcriber = AzureTranscriber(
        callback_final=handle_final_result,
        callback_interim=handle_interim_result,
        candidate_languages=["vi-VN", "en-US", "zh-CN", "ja-JP"]
    )
    transcriber.start()

    try:
        while True:
            # OPTIMIZATION: Nhận Text (JSON string) thay vì Bytes
            data_str = await websocket.receive_text()
            
            try:
                # Client gửi format: {"audio": "BASE64_STRING"}
                # Cách này giảm tải CPU client vì không phải convert base64 -> bytes array
                msg_json = json.loads(data_str)
                b64_audio = msg_json.get("audio")
                
                if b64_audio:
                    # Decode Base64 bằng thư viện C (nhanh hơn native python)
                    pcm_data = binascii.a2b_base64(b64_audio)
                    
                    # Amplify
                    louder_data = amplify_audio(pcm_data)
                    
                    # Check VAD (nhanh)
                    if check_voice_activity(louder_data):
                        transcriber.write_stream(louder_data)

            except Exception:
                continue # Skip bad frames để duy trì stream mượt

    except WebSocketDisconnect:
        audio_manager.disconnect(websocket, normalized_room_id)
    except Exception as e:
        logger.error(f"Audio Error: {e}")
        audio_manager.disconnect(websocket, normalized_room_id)
    finally:
        transcriber.stop()

# --- OTHER ENDPOINTS (KEEP AS IS) ---
@app.websocket("/signal")
async def signaling_endpoint(websocket: WebSocket, token: str = Query(...), roomId: str = Query(...)):
    # ... (Giữ nguyên logic cũ của bạn) ...
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

app.include_router(protected_router)
app.include_router(internal_router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, workers=1)