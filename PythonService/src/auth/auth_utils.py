import jwt
import logging
from fastapi import WebSocket, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

security = HTTPBearer()
PUBLIC_KEY = None

try:
    with open("public_key.pem", "rb") as f:
        PUBLIC_KEY = serialization.load_pem_public_key(
            f.read(), backend=default_backend()
        )
    logger.info("✅ Public key loaded successfully.")
except Exception as e:
    logger.critical(f"❌ Could not load public_key.pem: {e}")

async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
    if not token: return None
    try:
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {"verify_exp": True, "verify_aud": False}
        decoded_token = jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
        return decoded_token.get("sub")
    except Exception:
        return None

async def verify_token_http(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {"verify_exp": True, "verify_aud": False}
        return jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")