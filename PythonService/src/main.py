# main.py
from fastapi import (
    FastAPI,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    status,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import base64, json, os
import logging
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv

# Import core services
from src.core.session import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile

# Import API functions
from src.api.translation import translate_text
from src.api.chat_ai import chat_with_ai
from src.api.speech_to_text import speech_to_text

load_dotenv()

app = FastAPI()

# Load RSA public key for JWT verification
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


@app.on_event("shutdown")
async def shutdown_event():
    await close_redis_client()


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


class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


class ChatRequest(BaseModel):
    message: str
    history: list[dict]


@app.websocket("/ws/voice")
async def voice_stream(websocket: WebSocket, token: str):
    try:
        decoded_token = jwt.decode(
            token, PUBLIC_KEY, algorithms=["RS256"], issuer="LinguaMonkey.com"
        )
        user_id = decoded_token.get("sub")
    except Exception as e:
        logging.warning(f"WebSocket Auth failed: {e}")
        await websocket.close(code=1008)
        return

    await websocket.accept()
    logging.info(f"Client {user_id} connected to WebSocket")

    # Note: We can load user_profile here if speech_to_text needs personalization
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

            # Process with Whisper (speech_to_text)
            # We could pass user_profile here if ASR model supports biasing
            text, error = speech_to_text(
                audio_chunk, "en"
            )  # Assume English; make dynamic

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


@app.post("/translate")
async def translate(request: TranslationRequest, user: dict = Depends(verify_token)):
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


@app.post("/chat-ai")
async def chat(
    request: ChatRequest,
    user: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token, missing 'sub' (user_id)",
            )

        # Get personalized profile
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


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host="0.0.0.0", port=8000)
