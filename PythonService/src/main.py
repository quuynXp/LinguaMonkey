# src/main.py
from fastapi import (
    FastAPI,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    status,
    APIRouter # <-- ĐÃ THÊM
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import base64, json, os
import logging
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from datetime import datetime # <-- ĐÃ THÊM

# Import core services
from src.core.session import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile

# Import API functions
from src.api.translation import translate_text
from src.api.chat_ai import chat_with_ai
from src.api.speech_to_text import speech_to_text
from src.api.chat_ai import chat_with_ai, chat_with_ai_stream
from src.core.kafka_producer import get_kafka_producer, stop_kafka_producer, send_chat_to_kafka

load_dotenv()

# === CÀI ĐẶT CHUNG ===
try:
    with open("public_key.pem", "rb") as f:
        PUBLIC_KEY = serialization.load_pem_public_key(
            f.read(), backend=default_backend()
        )
except Exception as e:
    logging.error(f"Failed to load public key: {str(e)}")
    raise RuntimeError("Public key loading failed")

security = HTTPBearer()
redis_client = get_redis_client()


# === HÀM XÁC THỰC TẬP TRUNG ===

# 1. Cho HTTP (Giữ nguyên hàm của bạn)
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
        return decoded  # Returns user claims if valid
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}"
        )

# 2. Cho WebSocket (Hàm dependency mới)
async def get_websocket_user(websocket: WebSocket, token: str) -> str:
    """
    Xác thực token từ query param của WebSocket.
    Trả về user_id nếu thành công.
    Tự động đóng WS và raise WebSocketDisconnect nếu thất bại.
    """
    try:
        decoded_token = jwt.decode(
            token, PUBLIC_KEY, algorithms=["RS256"], issuer="LinguaMonkey.com"
        )
        user_id = decoded_token.get("sub")
        if not user_id:
            raise jwt.InvalidTokenError("Missing 'sub' (user_id) in token")
        return user_id
        
    except jwt.ExpiredSignatureError:
        reason = "Token expired"
        logging.warning(f"WebSocket Auth failed: {reason}")
        await websocket.close(code=1008, reason=reason)
        raise WebSocketDisconnect(code=1008, reason=reason)
    except Exception as e:
        reason = f"Invalid token: {str(e)}"
        logging.warning(f"WebSocket Auth failed: {reason}")
        await websocket.close(code=1008, reason=reason)
        raise WebSocketDisconnect(code=1008, reason=reason)

# === KHỞI TẠO APP VÀ ROUTERS ===
app = FastAPI()

# Router cho các API cần bảo vệ
protected_router = APIRouter(dependencies=[Depends(verify_token)])
# (Bạn có thể tạo public_router = APIRouter() cho các API public)


@app.on_event("shutdown")
async def shutdown_event():
    await close_redis_client()
    await stop_kafka_producer()

# === ĐỊNH NGHĨA MODEL ===
class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


class ChatRequest(BaseModel):
    message: str
    history: list[dict]


# === CÁC HANDLERS ===

# --- WebSocket Handlers (Gắn vào 'app') ---

@app.websocket("/ws/voice")
async def voice_stream(websocket: WebSocket, token: str):
    try:
        # GỌI HÀM AUTH TẬP TRUNG
        user_id = await get_websocket_user(websocket, token)
    except WebSocketDisconnect:
        return # Auth thất bại, kết nối đã bị đóng

    await websocket.accept()
    logging.info(f"Client {user_id} connected to WebSocket")

    # (Logic get_db / user_profile nếu cần)
    # async with AsyncSessionLocal() as db_session:
    #     user_profile = await get_user_profile(user_id, db_session, redis_client)

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
                await websocket.send_text(
                    json.dumps({"seq": msg.get("seq", 0), "error": error})
                )
            else:
                await websocket.send_text(
                    json.dumps({"seq": msg.get("seq", 0), "text": text})
                )
    except WebSocketDisconnect:
        logging.info(f"Client {user_id} disconnected")
    except Exception as e:
        logging.error(f"WebSocket Error: {e}")
        await websocket.close(code=1011)


@app.websocket("/chat-stream")
async def chat_stream(websocket: WebSocket, token: str):
    try:
        # GỌI HÀM AUTH TẬP TRUNG
        user_id = await get_websocket_user(websocket, token)
    except WebSocketDisconnect:
        return # Auth thất bại

    await websocket.accept()
    logging.info(f"Client {user_id} connected to AI Chat WebSocket")
    
    user_profile = None
    
    # Vẫn phải quản lý DB session thủ công cho WebSocket
    try:
        async with AsyncSessionLocal() as db:
            user_profile = await get_user_profile(user_id, db, redis_client)
            
    except Exception as e:
        logging.error(f"Failed to get user profile for {user_id}: {e}", exc_info=True)
        await websocket.close(code=1011, reason="Profile loading failed")
        return

    # Vòng lặp xử lý message
    room_id = None
    message_type = "TEXT"
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
                    logging.error("No roomId provided by client.")
                    await websocket.send_text(json.dumps({
                        "type": "error", "content": "roomId is required"
                    }))
                    continue
                
                full_ai_response = ""
                
                async for chunk in chat_with_ai_stream(prompt, history, user_profile):
                    full_ai_response += chunk
                    await websocket.send_text(json.dumps({
                        "type": "chat_response_chunk",
                        "content": chunk
                    }))
                
                await websocket.send_text(json.dumps({
                    "type": "chat_response_complete"
                }))

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
        logging.info(f"Client {user_id} disconnected from AI Chat")
    except Exception as e:
        logging.error(f"AI Chat WebSocket Error: {e}", exc_info=True)
        try:
            await websocket.send_text(json.dumps({
                "type": "error", "content": str(e)
            }))
        except:
            pass
    finally:
        if websocket.client_state.name != 'DISCONNECTED':
            await websocket.close(code=1011)


# --- HTTP Handlers (Gắn vào 'protected_router') ---

@protected_router.post("/translate")
async def translate(request: TranslationRequest, user: dict = Depends(verify_token)):
    # Auth đã chạy. 'user' là claims từ token.
    try:
        translated_text, error = translate_text(
            request.text, request.source_lang, request.target_lang
        )
        if error:
            raise HTTPException(status_code=500, detail=error)
        return {"translated_text": translated_text}
    except Exception as e:
        logging.error(f"REST API translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@protected_router.post("/chat-ai")
async def chat(
    request: ChatRequest,
    user: dict = Depends(verify_token), # Lấy claims
    db: AsyncSession = Depends(get_db), # Lấy DB session
):
    try:
        user_id = user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token, missing 'sub' (user_id)",
            )

        user_profile = await get_user_profile(user_id, db, redis_client)
        response, error = await chat_with_ai(
            request.message, request.history, "en", user_profile
        )

        if error:
            raise HTTPException(status_code=500, detail=error)
        return {"reply": response}
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# === KẾT NỐI ROUTER VÀO APP ===
app.include_router(protected_router, tags=["Protected API"])


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    # Cổng 8000 theo file gốc của bạn, dù 8001 mới là cổng expose trong Docker
    uvicorn.run(app, host="0.0.0.0", port=8000)