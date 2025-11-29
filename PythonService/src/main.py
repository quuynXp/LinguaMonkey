import uvicorn
import base64
import json
import logging
import jwt
import asyncio
from datetime import datetime
from collections import defaultdict
from typing import Dict, List
from contextlib import asynccontextmanager

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

from src.api.translation import translate_text
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
from src.api.speech_to_text import speech_to_text
# Use gRPC client instead of HTTP
from src.core.java_persistence_client import send_chat_to_java_via_grpc

load_dotenv(find_dotenv())
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

security = HTTPBearer()
PUBLIC_KEY = None

try:
    with open("public_key.pem", "rb") as f:
        PUBLIC_KEY = serialization.load_pem_public_key(
            f.read(), backend=default_backend()
        )
    logger.info("Public key loaded successfully.")
except Exception as e:
    logger.warning(f"Could not load public_key.pem: {e}")

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
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        logger.info(f"WebSocket joined room {room_id}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            text_data = json.dumps(message)
            for connection in self.active_connections[room_id][:]:
                try:
                    await connection.send_text(text_data)
                except Exception:
                    await self.disconnect(connection, room_id)

manager = ConnectionManager()
audio_buffers = defaultdict(list)
BUFFER_THRESHOLD_SECONDS = 1.5 
SAMPLE_RATE = 16000
BYTES_PER_SECOND = SAMPLE_RATE * 2
BUFFER_SIZE_LIMIT = int(BYTES_PER_SECOND * BUFFER_THRESHOLD_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_redis_client()

app = FastAPI(lifespan=lifespan)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        if not PUBLIC_KEY:
             return jwt.decode(credentials.credentials, options={"verify_signature": False})
             
        return jwt.decode(
            credentials.credentials, PUBLIC_KEY, algorithms=["RS256"],
            issuer="LinguaMonkey.com", options={"verify_exp": True}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

async def get_websocket_user(websocket: WebSocket, token: str) -> str:
    try:
        if not token:
             await websocket.close(code=1008, reason="Missing Token")
             raise WebSocketDisconnect()
        
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {"verify_exp": True}
        
        decoded_token = jwt.decode(
            token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", 
            options=options
        )
        user_id = decoded_token.get("sub") or decoded_token.get("userId")
        return user_id
    except Exception as e:
        logger.warning(f"WebSocket Auth failed: {e}")
        await websocket.close(code=1008, reason="Invalid Token")
        raise WebSocketDisconnect()

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

@protected_router.post("/translate")
async def translate(
    request: TranslationRequest, 
    user: dict = Depends(verify_token)
):
    try:
        translated_text, error = await asyncio.to_thread(
            translate_text, request.text, request.source_lang, request.target_lang
        )
        if error: 
            logger.error(f"Translation API error: {error}")
            # Vẫn trả về text gốc nếu lỗi để UI không bị vỡ, nhưng frontend sẽ nhận biết qua cấu trúc
        
        # SỬA LỖI QUAN TRỌNG: Bọc trong "result" để khớp với Frontend
        return {
            "code": 200,
            "result": {
                "translated_text": translated_text
            },
            "error": error
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

@app.websocket("/voice")
async def voice_stream(websocket: WebSocket, token: str = Query(...)):
    await get_websocket_user(websocket, token)
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            audio_chunk = base64.b64decode(msg.get("audio_chunk", "")) if msg.get("audio_chunk") else b""
            
            if audio_chunk:
                text, error = await asyncio.to_thread(speech_to_text, audio_chunk, "en")
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
    user_id = await get_websocket_user(websocket, token)
    await websocket.accept()
    
    db = AsyncSessionLocal()
    redis = await get_redis_client()
    
    try:
        user_profile = await get_user_profile(user_id, db, redis)
        
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "chat_request":
                raw_prompt = msg.get("prompt", "")
                history = msg.get("history", [])
                room_id = msg.get("roomId")
                
                if not room_id:
                    await websocket.send_text(json.dumps({"type": "error", "content": "roomId required"}))
                    continue

                actual_prompt = raw_prompt
                if raw_prompt == "INITIAL_WELCOME_MESSAGE":
                    actual_prompt = "Hello AI, please introduce yourself briefly in English and ask me what I want to learn today. Act as a friendly tutor."

                full_ai_response = ""
                async for chunk in chat_with_ai_stream(actual_prompt, history, user_profile):
                    full_ai_response += chunk
                    await websocket.send_text(json.dumps({
                        "type": "chat_response_chunk",
                        "content": chunk
                    }))
                
                await websocket.send_text(json.dumps({"type": "chat_response_complete"}))
                
                # 1. Save User's Message (gRPC to Java)
                if raw_prompt != "INITIAL_WELCOME_MESSAGE":
                    user_msg_payload = {
                        "userId": user_id, "roomId": room_id,
                        "content": raw_prompt,
                        "messageType": msg.get("messageType", "TEXT"),
                        "sentAt": datetime.now().isoformat()
                    }
                    asyncio.create_task(send_chat_to_java_via_grpc(user_msg_payload))

                # 2. Save AI's Response (gRPC to Java)
                ai_msg_payload = {
                    "userId": "AI_BOT", 
                    "roomId": room_id,
                    "content": full_ai_response,
                    "messageType": "TEXT",
                    "sentAt": datetime.now().isoformat()
                }
                asyncio.create_task(send_chat_to_java_via_grpc(ai_msg_payload))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Chat WS Error: {e}")
    finally:
        await db.close()

@app.websocket("/live-subtitles")
async def live_subtitles(websocket: WebSocket, token: str = Query(...), roomId: str = Query(...), nativeLang: str = Query("vi")):
    user_id = await get_websocket_user(websocket, token)
    await manager.connect(websocket, roomId)
    buffer_key = f"{roomId}_{user_id}"
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            original_text = ""

            if "audio_chunk" in msg and msg["audio_chunk"]:
                try:
                    chunk_bytes = base64.b64decode(msg["audio_chunk"])
                    audio_buffers[buffer_key].append(chunk_bytes)
                    
                    current_buffer_size = sum(len(c) for c in audio_buffers[buffer_key])
                    
                    if current_buffer_size > BUFFER_SIZE_LIMIT:
                        full_audio = b"".join(audio_buffers[buffer_key])
                        audio_buffers[buffer_key] = [] 
                        
                        stt_text, error = await asyncio.to_thread(speech_to_text, full_audio, "en")
                        
                        if not error and stt_text and len(stt_text.strip()) > 1:
                            original_text = stt_text
                except Exception as e:
                    logger.error(f"Audio processing error: {e}")
            
            elif "text" in msg:
                original_text = msg["text"]

            if original_text:
                translated_text, err = await asyncio.to_thread(
                    translate_text, original_text, "auto", nativeLang
                )
                if err: translated_text = "[Translation Error]"
                
                await manager.broadcast_to_room({
                    "type": "subtitle",
                    "senderId": user_id,
                    "original": original_text,
                    "originalLang": "en", 
                    "translated": translated_text,
                    "translatedLang": nativeLang,
                    "timestamp": datetime.now().isoformat()
                }, roomId)

    except WebSocketDisconnect:
        manager.disconnect(websocket, roomId)
        if buffer_key in audio_buffers: del audio_buffers[buffer_key]
    except Exception as e:
        logger.error(f"Live subtitle error: {e}")
        manager.disconnect(websocket, roomId)
        try: await websocket.close(code=1011)
        except: pass

app.include_router(protected_router, tags=["Protected API"])
app.include_router(internal_router, tags=["Internal API"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)