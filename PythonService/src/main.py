# file: PythonService/src/main.py
from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, APIRouter
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import base64, json, os
import logging
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from datetime import datetime
from collections import defaultdict
from typing import Dict, List

# Import core services
from src.core.session import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile

# Import API functions
from src.api.translation import translate_text
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
from src.api.speech_to_text import speech_to_text
from src.core.kafka_producer import get_kafka_producer, stop_kafka_producer, send_chat_to_kafka

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

audio_buffers = defaultdict(list)
BUFFER_THRESHOLD_SECONDS = 2
SAMPLE_RATE = 16000
BYTES_PER_SECOND = SAMPLE_RATE * 2
BUFFER_SIZE_LIMIT = BYTES_PER_SECOND * BUFFER_THRESHOLD_SECONDS

# === CÀI ĐẶT CHUNG ===
try:
    # FIX: Đọc file từ đường dẫn đã mount volume
    with open("/app/public_key.pem", "rb") as f:
        PUBLIC_KEY = serialization.load_pem_public_key(
            f.read(),
            backend=default_backend()
        )
    logger.info("Public key loaded successfully.")
except Exception as e:
    logging.error(f"Failed to load public key from /app/public_key.pem: {str(e)}")
    # Fallback nếu chạy local không qua docker
    try:
        with open("public_key.pem", "rb") as f:
             PUBLIC_KEY = serialization.load_pem_public_key(f.read(), backend=default_backend())
    except:
        raise RuntimeError("Public key loading failed")

security = HTTPBearer()
redis_client = get_redis_client()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        logger.info(f"WebSocket joined room {room_id}. Total: {len(self.active_connections[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if len(self.active_connections[room_id]) == 0:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            text_data = json.dumps(message)
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_text(text_data)
                except Exception as e:
                    logger.error(f"Error broadcasting to socket: {e}")

manager = ConnectionManager()

# === HÀM XÁC THỰC ===
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded = jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=["RS256"],
            issuer="LinguaMonkey.com",
            options={"verify_exp": True},
        )
        return decoded
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

async def get_websocket_user(websocket: WebSocket, token: str) -> str:
    try:
        decoded_token = jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=["RS256"],
            issuer="LinguaMonkey.com"
        )
        user_id = decoded_token.get("sub") or decoded_token.get("userId")
        if not user_id:
            raise Exception("Missing user_id in token")
        return user_id
    except Exception as e:
        logger.warning(f"WebSocket Auth failed: {e}")
        await websocket.close(code=1008, reason="Invalid Token")
        raise WebSocketDisconnect()

# === APP & ROUTES ===
app = FastAPI()
protected_router = APIRouter(dependencies=[Depends(verify_token)])

@app.on_event("shutdown")
async def shutdown_event():
    await close_redis_client()
    await stop_kafka_producer()

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class ChatRequest(BaseModel):
    message: str
    history: list[dict]

# --- WebSocket Handlers ---
# FIX: Bỏ prefix /ws/py/ vì Kong đã strip nó đi

@app.websocket("/voice") # Kong maps /ws/py/voice -> /voice
async def voice_stream(websocket: WebSocket, token: str):
    try:
        user_id = await get_websocket_user(websocket, token)
    except WebSocketDisconnect:
        return
    
    await websocket.accept()
    logging.info(f"Client {user_id} connected to Voice Stream")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            audio_chunk = (
                base64.b64decode(msg.get("audio_chunk", ""))
                if msg.get("audio_chunk")
                else b""
            )
            text, error = speech_to_text(audio_chunk, "en")
            if error:
                await websocket.send_text(json.dumps({"seq": msg.get("seq", 0), "error": error}))
            else:
                await websocket.send_text(json.dumps({"seq": msg.get("seq", 0), "text": text}))
    except WebSocketDisconnect:
        logging.info(f"Client {user_id} disconnected")
    except Exception as e:
        logging.error(f"Voice WS Error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass

@app.websocket("/chat-stream") # Kong maps /ws/py/chat-stream -> /chat-stream
async def chat_stream(websocket: WebSocket, token: str):
    try:
        user_id = await get_websocket_user(websocket, token)
    except WebSocketDisconnect:
        return

    await websocket.accept()
    logging.info(f"Client {user_id} connected to AI Chat Stream")
    
    try:
        async with AsyncSessionLocal() as db:
            user_profile = await get_user_profile(user_id, db, redis_client)
    except Exception as e:
        logging.error(f"Profile load failed: {e}")
        await websocket.close(code=1011)
        return

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "chat_request":
                prompt = msg.get("prompt", "")
                history = msg.get("history", [])
                room_id = msg.get("roomId")
                message_type = msg.get("messageType", "TEXT")

                if not room_id:
                    await websocket.send_text(json.dumps({"type": "error", "content": "roomId required"}))
                    continue

                full_ai_response = ""
                async for chunk in chat_with_ai_stream(prompt, history, user_profile):
                    full_ai_response += chunk
                    await websocket.send_text(json.dumps({
                        "type": "chat_response_chunk",
                        "content": chunk
                    }))
                
                await websocket.send_text(json.dumps({"type": "chat_response_complete"}))
                
                # Persist to Kafka
                kafka_payload = {
                    "userId": user_id,
                    "roomId": room_id,
                    "userPrompt": prompt,
                    "aiResponse": full_ai_response,
                    "messageType": message_type,
                    "sentAt": datetime.now().isoformat()
                }
                await send_chat_to_kafka(kafka_payload)

    except WebSocketDisconnect:
        logging.info(f"Client {user_id} disconnected from Chat Stream")
    except Exception as e:
        logging.error(f"Chat Stream Error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass

@app.websocket("/live-subtitles") # Kong maps /ws/py/live-subtitles -> /live-subtitles
async def live_subtitles(websocket: WebSocket, token: str, roomId: str, nativeLang: str = "vi"):
    try:
        user_id = await get_websocket_user(websocket, token)
    except WebSocketDisconnect:
        return

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
                        
                        stt_text, error = speech_to_text(full_audio, "en")
                        if not error and stt_text and stt_text.strip():
                            original_text = stt_text
                except Exception as e:
                    logger.error(f"Audio processing error: {e}")
            
            elif "text" in msg:
                original_text = msg["text"]

            if original_text:
                translated_text, err = translate_text(original_text, "auto", nativeLang)
                if err: translated_text = "Translation error"
                
                response_payload = {
                    "type": "subtitle",
                    "senderId": user_id,
                    "original": original_text,
                    "originalLang": "en",
                    "translated": translated_text,
                    "translatedLang": nativeLang,
                    "timestamp": datetime.now().isoformat()
                }
                await manager.broadcast_to_room(response_payload, roomId)

    except WebSocketDisconnect:
        manager.disconnect(websocket, roomId)
        if buffer_key in audio_buffers: del audio_buffers[buffer_key]
    except Exception as e:
        logger.error(f"Live subtitle error: {e}")
        manager.disconnect(websocket, roomId)
        try: await websocket.close(code=1011)
        except: pass

# --- HTTP Handlers ---
@protected_router.post("/translate")
async def translate(request: TranslationRequest, user: dict = Depends(verify_token)):
    try:
        translated_text, error = translate_text(request.text, request.source_lang, request.target_lang)
        if error: raise HTTPException(status_code=500, detail=error)
        return {"translated_text": translated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@protected_router.post("/chat-ai")
async def chat(request: ChatRequest, user: dict = Depends(verify_token), db: AsyncSession = Depends(get_db)):
    try:
        user_id = user.get("sub")
        user_profile = await get_user_profile(user_id, db, redis_client)
        response, error = await chat_with_ai(request.message, request.history, "en", user_profile)
        if error: raise HTTPException(status_code=500, detail=error)
        return {"reply": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(protected_router, tags=["Protected API"])

if __name__ == "__main__":
    import uvicorn
    # Chạy port 8001 vì đây là REST/WS port
    uvicorn.run(app, host="0.0.0.0", port=8001)