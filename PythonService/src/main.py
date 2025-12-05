import base64
import json
import logging
import jwt
import asyncio
import os
from datetime import datetime
from collections import defaultdict
from typing import Dict, List
from contextlib import asynccontextmanager
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

from src.core.session import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile

from src.api.translation import translate_text
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
from src.api.speech_to_text import speech_to_text
from src.api.tts_generator import generate_tts
from src.core.java_persistence_client import send_chat_to_java_via_grpc
from src.core.translator import get_translator
from src.worker.tasks import warm_up_redis_task, populate_lexicon_from_community_task
from src.scripts.seed_lexicon import seed_data

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
        self.active_connections = defaultdict(list)
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        self.active_connections[room_id].append(websocket)
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
    async def broadcast(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            data = json.dumps(message)
            for conn in self.active_connections[room_id]:
                try: await conn.send_text(data)
                except: pass
    async def broadcast_json(self, message: dict, room_id: str):
        await self.broadcast(message, room_id)

manager = ConnectionManager()
audio_buffers = defaultdict(list)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis_client()
    logger.info("Redis client initialized.")
    yield
    await close_redis_client()
    logger.info("Redis client closed.")

app = FastAPI(lifespan=lifespan)

# VERIFY TOKEN STATELESSLY USING PUBLIC KEY
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        if not PUBLIC_KEY:
             return jwt.decode(token, options={"verify_signature": False})
        
        # Verify using RS256 and Public Key
        return jwt.decode(
            token, 
            PUBLIC_KEY, 
            algorithms=["RS256"],
            issuer="LinguaMonkey.com", 
            options={"verify_exp": True}
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

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
        return decoded_token.get("sub") or decoded_token.get("userId")
    except Exception as e:
        logger.warning(f"WebSocket Auth failed: {e}")
        await websocket.close(code=1008, reason="Invalid Token")
        raise WebSocketDisconnect()

# [GIỮ NGUYÊN TOÀN BỘ LOGIC ROUTER BÊN DƯỚI]

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

@internal_router.post("/trigger-warmup")
async def trigger_warmup():
    task = warm_up_redis_task.delay()
    return {"status": "Warmup task triggered", "task_id": str(task.id)}

@internal_router.post("/trigger-community-fetch")
async def trigger_community_fetch():
    task = populate_lexicon_from_community_task.delay()
    return {"status": "Community fetch task triggered", "task_id": str(task.id)}

@internal_router.post("/seed-database")
async def run_seed_database():
    try:
        await seed_data()
        return {"status": "Database seeding started and warmup triggered"}
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@internal_router.get("/check-redis/{lang}/{text}")
async def check_redis_key(lang: str, text: str, redis: Redis = Depends(get_redis_client)):
    key = f"lex:{lang}:{text.strip().lower()}"
    value = await redis.get(key)
    return {
        "key": key,
        "exists": value is not None,
        "value": json.loads(value) if value else None
    }

@protected_router.post("/translate")
async def translate(
    request: TranslationRequest, 
    user: dict = Depends(verify_token)
):
    try:
        translated_text, error = await asyncio.to_thread(
            translate_text, request.text, request.source_lang, request.target_lang
        )
        if error: logger.error(f"Translation API error: {error}")
        return {
            "code": 200,
            "result": { "translated_text": translated_text },
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
                
                if raw_prompt != "INITIAL_WELCOME_MESSAGE":
                    asyncio.create_task(send_chat_to_java_via_grpc({
                        "userId": user_id, "roomId": room_id,
                        "content": raw_prompt,
                        "messageType": msg.get("messageType", "TEXT"),
                        "sentAt": datetime.now().isoformat()
                    }))
                
                asyncio.create_task(send_chat_to_java_via_grpc({
                    "userId": "AI_BOT", 
                    "roomId": room_id,
                    "content": full_ai_response,
                    "messageType": "TEXT",
                    "sentAt": datetime.now().isoformat()
                }))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Chat WS Error: {e}")
    finally:
        await db.close()

@app.websocket("/live-subtitles")
async def live_subtitles(
    websocket: WebSocket, 
    token: str = Query(...), 
    roomId: str = Query(...), 
    nativeLang: str = Query("vi"),
    spokenLang: str = Query("en")
):
    user_id = await get_websocket_user(websocket, token)
    await manager.connect(websocket, roomId)
    redis = await get_redis_client()
    translator = get_translator(redis)
    buffer_key = f"{roomId}_{user_id}"
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
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
                        "translatedLang": nativeLang
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

app.include_router(protected_router, tags=["Protected API"])
app.include_router(internal_router, tags=["Internal API"])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)