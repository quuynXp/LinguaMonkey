import base64
import json
import logging
import jwt
import asyncio
import os
import uuid
from datetime import datetime
from collections import defaultdict
from typing import Dict, List
from contextlib import asynccontextmanager
import uvicorn

from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, APIRouter, Query, BackgroundTasks
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
from src.core.java_persistence_client import send_chat_to_java_via_grpc
from src.core.translator import get_translator
# Import Task
from src.worker.tasks import ingest_huggingface_task

load_dotenv(find_dotenv())
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# UUID cố định cho AI Bot (đã insert vào DB ở bước trước)
AI_BOT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')

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
    
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
    
    async def broadcast(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            data = json.dumps(message)
            for conn in self.active_connections[room_id]:
                try: 
                    await conn.send_text(data)
                except Exception as e:
                    logger.error(f"Broadcast error: {e}")

    async def broadcast_json(self, message: dict, room_id: str):
        await self.broadcast(message, room_id)

manager = ConnectionManager()
audio_buffers = defaultdict(list)

# --- LIFESPAN EVENT: AUTO TRIGGER INGESTION ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup
    await get_redis_client()
    logger.info("Redis client initialized.")
    
    # Trigger task nạp dữ liệu Hugging Face ngay khi Server chạy
    logger.info("🚀 Triggering Auto-Ingest Task...")
    try:
        ingest_huggingface_task.delay()
        logger.info("✅ Auto-Ingest Task sent to Worker.")
    except Exception as e:
        logger.error(f"❌ Failed to trigger Auto-Ingest: {e}")

    yield
    
    # 2. Shutdown
    await close_redis_client()
    logger.info("Redis client closed.")

app = FastAPI(lifespan=lifespan)

# --- AUTH HELPER (HTTP) ---
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
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

# --- AUTH HELPER (WEBSOCKET) ---
async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
    if not token:
        logger.warning("WS Auth: Token missing")
        return None
        
    try:
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {
            "verify_exp": True,
            "verify_aud": False,
            "verify_iss": True
        }
        
        decoded_token = jwt.decode(
            token, 
            key, 
            algorithms=["RS256"], 
            issuer="LinguaMonkey.com", 
            options=options
        )
        
        user_id = decoded_token.get("sub")
        if not user_id:
            logger.warning("WS Auth: No 'sub' claim in token")
            return None
            
        return user_id
        
    except jwt.ExpiredSignatureError:
        logger.warning("WS Auth: Token expired")
        return None
    except Exception as e:
        logger.warning(f"WS Auth failed: {e}")
        return None

# ==============================================================================
# INTERNAL ENDPOINTS
# ==============================================================================
@internal_router.post("/invalidate-cache") 
async def invalidate_user_cache(
    request: CacheInvalidationRequest,
    redis: Redis = Depends(get_redis_client)
):
    cache_key = f"user_profile:{request.user_id}"
    try:
        await redis.delete(cache_key)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Invalidate cache error: {e}")
        raise HTTPException(status_code=500, detail="Redis error")

@internal_router.post("/trigger-hf-ingest")
async def trigger_hf_ingest():
    task = ingest_huggingface_task.delay()
    return {"status": "Hugging Face ingestion task sent to worker", "task_id": str(task.id)}

@internal_router.get("/check-redis/{lang}/{text}")
async def check_redis_key(lang: str, text: str, redis: Redis = Depends(get_redis_client)):
    key = f"lex:{lang}:{text.strip().lower()}"
    value = await redis.hgetall(key)
    return {
        "key": key,
        "exists": bool(value),
        "value": value
    }

# ==============================================================================
# PROTECTED API
# ==============================================================================
@protected_router.post("/translate")
async def translate(
    request: TranslationRequest, 
    user: dict = Depends(verify_token),
    redis: Redis = Depends(get_redis_client)
):
    try:
        translator = get_translator(redis)
        translated_text, detected_lang = await translator.translate(
            request.text, request.source_lang, request.target_lang
        )
        return {
            "code": 200,
            "result": { 
                "translated_text": translated_text,
                "detected_lang": detected_lang
            },
            "error": None
        }
    except Exception as e:
        logger.error(f"Translate endpoint exception: {e}")
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
async def text_to_speech_endpoint(
    text: str,
    language: str,
    user: dict = Depends(verify_token),
    redis: Redis = Depends(get_redis_client)
):
    audio_bytes, error = await generate_tts(text, language, redis)
    if error:
        raise HTTPException(status_code=500, detail=error)
    return {
        "audio_base64": base64.b64encode(audio_bytes).decode('utf-8')
    }

# ==============================================================================
# WEBSOCKETS
# ==============================================================================
@app.websocket("/voice")
async def voice_stream(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    user_id = await validate_websocket_token(websocket, token)
    if not user_id:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            audio_chunk = base64.b64decode(msg.get("audio_chunk", "")) if msg.get("audio_chunk") else b""
            if audio_chunk:
                text, detected_lang, error = await asyncio.to_thread(speech_to_text, audio_chunk, "en")
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
        logger.error(f"Chat WS Rejected: Invalid token for token start: {token[:10]}...")
        await websocket.close(code=1008, reason="Unauthorized")
        return

    logger.info(f"✅ User {user_id_str} connected to AI Chat")
    
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
                
                if not room_id_str or not raw_prompt:
                    continue
                
                try:
                    room_uuid = uuid.UUID(room_id_str)
                    user_uuid = uuid.UUID(user_id_str)
                except ValueError:
                    logger.error(f"Invalid UUID format")
                    continue

                # 1. Save User Message (Python DB)
                try:
                    user_msg_db = ChatMessage(
                        chat_message_id=uuid.uuid4(),
                        content=raw_prompt,
                        room_id=room_uuid,
                        sender_id=user_uuid,
                        message_type=MessageType.TEXT.value,
                        sent_at=datetime.utcnow()
                    )
                    db_session.add(user_msg_db)
                    await db_session.commit()
                except Exception as e:
                    logger.error(f"Failed to save user message: {e}")
                    await db_session.rollback()

                # DISABLE DUPLICATE GRPC CALL
                # asyncio.create_task(send_chat_to_java_via_grpc({...}))

                # 2. Stream AI Response
                full_ai_response = ""
                async for chunk in chat_with_ai_stream(raw_prompt, history, user_profile):
                    full_ai_response += chunk
                    await websocket.send_text(json.dumps({
                        "type": "chat_response_chunk",
                        "content": chunk,
                        "roomId": room_id_str
                    }))
                
                await websocket.send_text(json.dumps({"type": "chat_response_complete", "roomId": room_id_str}))
                
                # 3. Save AI Message (Python DB Only)
                if full_ai_response.strip():
                    try:
                        ai_msg_db = ChatMessage(
                            chat_message_id=uuid.uuid4(),
                            content=full_ai_response,
                            room_id=room_uuid,
                            sender_id=AI_BOT_ID,
                            message_type=MessageType.TEXT.value,
                            sent_at=datetime.utcnow()
                        )
                        db_session.add(ai_msg_db)
                        await db_session.commit()
                    except Exception as e:
                        logger.error(f"Failed to save AI message: {e}")
                        await db_session.rollback()

                    # DISABLE DUPLICATE GRPC CALL
                    # asyncio.create_task(send_chat_to_java_via_grpc({...}))

    except WebSocketDisconnect:
        logger.info(f"User {user_id_str} disconnected form Chat AI")
    except Exception as e:
        logger.error(f"Chat WS Error: {e}", exc_info=True)
    finally:
        await db_session.close()

@app.websocket("/live-subtitles")
async def live_subtitles(
    websocket: WebSocket, 
    token: str = Query(...), 
    roomId: str = Query(...), 
    nativeLang: str = Query("vi"),
    spokenLang: str = Query("en")
):
    await websocket.accept()
    user_id = await validate_websocket_token(websocket, token)
    
    if not user_id:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await manager.connect(websocket, roomId)
    redis = await get_redis_client()
    
    translator = get_translator(redis)
    buffer_key = f"{roomId}_{user_id}"
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "webrtc_signal":
                await manager.broadcast_json(msg, roomId)
                continue
                
            original_text = ""
            if "audio_chunk" in msg and msg["audio_chunk"]:
                chunk = base64.b64decode(msg["audio_chunk"])
                audio_buffers[buffer_key].append(chunk)
                full_audio = b"".join(audio_buffers[buffer_key]) 
                
                stt_text, detected_lang, _ = await asyncio.to_thread(speech_to_text, full_audio, spokenLang)
                if stt_text and len(stt_text.strip()) > 1:
                    translated_text, _ = await translator.translate(stt_text, detected_lang, nativeLang)
                    await manager.broadcast_json({
                        "type": "subtitle",
                        "original": stt_text,
                        "originalLang": detected_lang,
                        "translated": translated_text,
                        "translatedLang": nativeLang,
                        "senderId": user_id
                    }, roomId)
            elif "text" in msg:
                original_text = msg["text"]
            
            if original_text:
                translated, err = await translator.translate(original_text, spokenLang, nativeLang)
                await manager.broadcast({
                    "type": "subtitle",
                    "senderId": user_id,
                    "original": original_text,
                    "originalLang": spokenLang,
                    "translated": translated,
                    "translatedLang": nativeLang,
                    "timestamp": datetime.now().isoformat()
                }, roomId)
    except WebSocketDisconnect:
        manager.disconnect(websocket, roomId)
        if buffer_key in audio_buffers: del audio_buffers[buffer_key]
    except Exception as e:
        logger.error(f"Live Subtitles WS Error: {e}")
        manager.disconnect(websocket, roomId)

app.include_router(protected_router, tags=["Protected API"])
app.include_router(internal_router, tags=["Internal API"])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001)) 
    uvicorn.run(app, host="0.0.0.0", port=port, proxy_headers=True, forwarded_allow_ips="*")