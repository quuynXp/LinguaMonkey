import logging
import httpx
import json
import os

logger = logging.getLogger(__name__)

JAVA_SERVICE_URL = os.getenv("JAVA_SERVICE_URL", "http://linguavietnameseapp:8080")
PERSISTENCE_ENDPOINT = f"{JAVA_SERVICE_URL}/api/internal/persistence/chat"

http_client = httpx.AsyncClient(timeout=10.0) 

async def send_chat_to_java_persistence(payload: dict):
    """
    Gửi payload chat (user + AI) đến Java service để lưu trữ qua HTTP POST.
    """
    try:
        response = await http_client.post(
            PERSISTENCE_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status() # Ném Exception nếu status code là 4xx hoặc 5xx
        logger.info(f"Successfully sent chat persistence event for user: {payload.get('userId')} via HTTP.")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP Error {e.response.status_code} during chat persistence: {e.response.text}")
    except httpx.RequestError as e:
        logger.error(f"Network error during chat persistence: {e}")
    except Exception as e:
        logger.error(f"General error during chat persistence: {e}")

async def stop_http_client():
    await http_client.close()