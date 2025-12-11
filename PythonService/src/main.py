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
import webrtcvad
import binascii
import regex as re
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional, Set
from contextlib import asynccontextmanager
from asyncio import Queue, Semaphore
import numpy as np
import uvicorn

from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, status, APIRouter, Query
)
from src.core.models import VideoCall, VideoCallStatus
from src.core.video_call_service import start_or_join_call, end_call_if_empty
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

# --- CONFIG ---
VOLUME_GAIN_FACTOR = 1.2 # Giảm gain xuống để tránh méo tiếng và echo
MAX_INT16 = 32767
MIN_INT16 = -32768
RESET_BUFFER_TIMEOUT = 2.0 

# VAD Mode 2: Cân bằng giữa lọc nhiễu và bắt giọng nói
vad = webrtcvad.Vad(2)

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

# --- CONNECTION MANAGER (OPTIMIZED GROUP BROADCAST) ---
class ConnectionManager:
    def __init__(self):
        self.active_connections = defaultdict(list)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None, native_lang: str = None):
        await websocket.accept()
        # Default config
        meta = {
            "ws": websocket, 
            "user_id": user_id, 
            "native_lang": (native_lang or "vi"),
            "config": {"subtitleMode": "dual", "micEnabled": True}
        }
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

    def get_participant_count(self, room_id: str) -> int:
        if room_id in self.active_connections:
            return len(self.active_connections[room_id])
        return 0

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

    # --- CORE LOGIC: GROUP TRANSLATION & BROADCAST ---
    async def broadcast_subtitle(self, 
                               text: str, 
                               detected_lang: str, 
                               room_id: str, 
                               sender_id: str, 
                               is_final: bool = False):
        """
        Xử lý thông minh: 
        1. Gom nhóm user theo ngôn ngữ đích (Target Language).
        2. Dịch 1 lần cho mỗi nhóm ngôn ngữ.
        3. Gửi kết quả về cho user.
        """
        if room_id not in self.active_connections: return
        if not text.strip(): return

        redis = await get_redis_client()
        translator = get_translator(redis)
        
        src_lang_norm = detected_lang.split('-')[0].lower() if detected_lang else ""
        
        # 1. Phân loại User theo nhu cầu dịch
        # Key: 'vi', 'en', 'ja' ... Value: List[ws_connection]
        translation_groups = defaultdict(list)
        # Những user không cần dịch (cùng ngôn ngữ gốc hoặc chọn mode 'original')
        direct_send_group = []

        for meta in self.active_connections[room_id]:
            user_id_recv = str(meta.get("user_id"))
            
            # Skip người nói (để họ tự thấy local) hoặc người tắt sub
            recv_mode = meta.get("config", {}).get("subtitleMode", "dual")
            if recv_mode == "off": continue
            if user_id_recv == str(sender_id): continue 

            recv_native = meta.get("native_lang", "vi")
            recv_lang_norm = recv_native.split('-')[0].lower()

            # Logic phân loại
            if src_lang_norm == recv_lang_norm or recv_mode == "original":
                # Không cần dịch
                direct_send_group.append(meta["ws"])
            else:
                # Cần dịch sang recv_native
                translation_groups[recv_native].append(meta["ws"])

        # 2. Thực hiện dịch (Chỉ khi is_final = True để tiết kiệm)
        # Cache kết quả dịch tạm thời: { 'vi': 'Xin chào', 'en': 'Hello' }
        translation_results = {}

        if is_final and translation_groups:
            # Loop qua các ngôn ngữ đích cần thiết
            for target_lang in translation_groups.keys():
                try:
                    # Gọi translator (đã có Redis Cache LPM bên trong)
                    # DB Error handle nằm trong translator, không crash app
                    trans_text, _ = await translator.translate(text, detected_lang, target_lang)
                    translation_results[target_lang] = trans_text
                except Exception as e:
                    logger.error(f"Translation failed for {target_lang}: {e}")
                    translation_results[target_lang] = "" # Fallback về rỗng

        # 3. Gửi tin nhắn (Fan-out)
        send_tasks = []

        # 3a. Gửi cho nhóm Direct (Không dịch)
        payload_base = {
            "type": "subtitle",
            "status": "complete" if is_final else "processing",
            "senderId": sender_id,
            "original": text,
            "originalLang": detected_lang,
            "translated": ""
        }
        msg_direct = json.dumps(payload_base, ensure_ascii=False)
        for ws in direct_send_group:
            send_tasks.append(ws.send_text(msg_direct))

        # 3b. Gửi cho các nhóm cần dịch
        for lang, sockets in translation_groups.items():
            payload = payload_base.copy()
            if is_final:
                payload["translated"] = translation_results.get(lang, "")
            else:
                payload["translated"] = "..." # Hiệu ứng đang dịch
            
            msg_translated = json.dumps(payload, ensure_ascii=False)
            for ws in sockets:
                send_tasks.append(ws.send_text(msg_translated))

        # Chạy tất cả task gửi tin cùng lúc
        if send_tasks:
            try:
                await asyncio.gather(*send_tasks, return_exceptions=True)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")

signal_manager = ConnectionManager()
audio_manager = ConnectionManager()

# Cache text để nối câu
user_text_cache: Dict[str, str] = defaultdict(str)
user_last_speech_time: Dict[str, float] = defaultdict(float)
# Cache để chặn lặp âm (Anti-Echo)
user_last_final_text: Dict[str, str] = defaultdict(str)

def amplify_audio(pcm_data: bytes) -> bytes:
    try:
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)
        amplified = audio_array * VOLUME_GAIN_FACTOR
        amplified = np.clip(amplified, MIN_INT16, MAX_INT16)
        return amplified.astype(np.int16).tobytes()
    except Exception:
        return pcm_data

def check_voice_activity(pcm_data: bytes, sample_rate=16000) -> bool:
    try:
        chk_len = 960 
        if len(pcm_data) >= chk_len:
            return vad.is_speech(pcm_data[:chk_len], sample_rate)
        
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)
        rms = np.sqrt(np.mean(audio_array**2))
        return rms > 300 # Giảm ngưỡng RMS một chút
    except Exception:
        return True

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

async def validate_websocket_token(websocket: WebSocket, token: str) -> str:
    if not token: return None
    try:
        key = PUBLIC_KEY if PUBLIC_KEY else ""
        options = {"verify_signature": False} if PUBLIC_KEY is None else {"verify_exp": True, "verify_aud": False}
        decoded_token = jwt.decode(token, key, algorithms=["RS256"], issuer="LinguaMonkey.com", options=options)
        return decoded_token.get("sub")
    except Exception:
        return None

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
    buffer_key = f"{normalized_room_id}_{user_id}"
    
    # Callback Interim (Đang nói)
    async def handle_interim_result(text: str, detected_lang_code: str):
        # Chỉ gửi interim nếu text khác rỗng và không quá ngắn
        if len(text) > 1:
            await audio_manager.broadcast_subtitle(
                text=text,
                detected_lang=detected_lang_code,
                room_id=normalized_room_id,
                sender_id=user_id,
                is_final=False
            )

    # Callback Final (Chốt câu)
    async def handle_final_result(text: str, detected_lang_code: str):
        try:
            clean_text = text.strip()
            if not clean_text: return

            # --- ANTI-ECHO LOGIC ---
            # Nếu câu mới y hệt câu cũ vừa nói -> Bỏ qua (Do Azure nhận diện lại tiếng vọng từ loa)
            last_text = user_last_final_text[buffer_key]
            if clean_text.lower() == last_text.lower():
                return
            
            # Nếu câu mới là tập con của câu cũ (VD: "Hello" sau "Hello world") -> Bỏ qua
            if last_text and (clean_text in last_text or last_text in clean_text):
                 # Check độ dài, nếu quá ngắn so với câu trước thì là nhiễu
                 if len(clean_text) < len(last_text) * 0.8:
                     return

            user_last_final_text[buffer_key] = clean_text # Update last text
            # -----------------------

            # Logic nối chuỗi hiển thị
            current_time = time.time()
            if user_last_speech_time[buffer_key] > 0 and (current_time - user_last_speech_time[buffer_key]) > RESET_BUFFER_TIMEOUT:
                user_text_cache[buffer_key] = ""
            
            user_last_speech_time[buffer_key] = current_time
            previous_text = user_text_cache[buffer_key]
            
            # Nối chuỗi thông minh
            if previous_text and not previous_text.endswith(('.', '?', '!')):
                new_full = (previous_text + " " + clean_text).strip()
            else:
                new_full = clean_text

            user_text_cache[buffer_key] = new_full

            # Reset nếu quá dài hoặc hết câu
            is_sentence_end = clean_text.endswith(('.', '?', '!'))
            if is_sentence_end or len(new_full) > 150: 
                user_text_cache[buffer_key] = ""

            # Gửi Broadcast
            await audio_manager.broadcast_subtitle(
                text=clean_text,
                detected_lang=detected_lang_code,
                room_id=normalized_room_id,
                sender_id=user_id,
                is_final=True
            )
            
        except Exception as e:
            logger.error(f"Handle final error: {e}")

    # Config Azure
    transcriber = AzureTranscriber(
        callback_final=handle_final_result,
        callback_interim=handle_interim_result,
        candidate_languages=["vi-VN", "en-US", "zh-CN", "ja-JP"]
    )
    transcriber.start()

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                msg_json = json.loads(data_str)
                
                # --- UPDATE CONFIG TỪ CLIENT ---
                if "config" in msg_json:
                    # Update config vào memory của ConnectionManager
                    for meta in audio_manager.active_connections[normalized_room_id]:
                        if str(meta["user_id"]) == str(user_id):
                            meta["config"] = msg_json["config"]
                            if "nativeLang" in msg_json: 
                                meta["native_lang"] = msg_json["nativeLang"]
                            break
                    
                    # Nếu client báo tắt Mic -> Không xử lý audio nữa
                    if not msg_json["config"].get("micEnabled", True):
                        continue
                    continue # Config msg, không có audio

                # --- XỬ LÝ AUDIO ---
                # Check lại mic status từ meta (double check)
                current_meta = next((m for m in audio_manager.active_connections[normalized_room_id] if str(m["user_id"]) == str(user_id)), None)
                if current_meta and not current_meta.get("config", {}).get("micEnabled", True):
                    continue

                b64_audio = msg_json.get("audio")
                if b64_audio:
                    pcm_data = binascii.a2b_base64(b64_audio)
                    louder_data = amplify_audio(pcm_data)
                    
                    if check_voice_activity(louder_data):
                        transcriber.write_stream(louder_data)

            except Exception:
                continue

    except WebSocketDisconnect:
        audio_manager.disconnect(websocket, normalized_room_id)
    except Exception as e:
        logger.error(f"Audio Error: {e}")
        audio_manager.disconnect(websocket, normalized_room_id)
    finally:
        transcriber.stop()

@app.websocket("/signal")
async def signaling_endpoint(websocket: WebSocket, token: str = Query(...), roomId: str = Query(...)):
    normalized_room_id = str(roomId).strip().lower()
    user_id = await validate_websocket_token(websocket, token)
    
    if not user_id:
        await websocket.close(code=1008)
        return

    await signal_manager.connect(websocket, normalized_room_id, user_id=user_id)
    
    async with AsyncSessionLocal() as db_session:
        await start_or_join_call(db_session, normalized_room_id, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            # Forward WebRTC signals
            if msg.get("type") in ["webrtc_signal", "JOIN_ROOM", "offer", "answer", "ice_candidate"]:
                msg["senderId"] = user_id
                if msg.get("type") == "JOIN_ROOM":
                    join_msg = {"type": "webrtc_signal", "senderId": user_id, "payload": {"type": "JOIN_ROOM"}}
                    await signal_manager.broadcast_except(join_msg, normalized_room_id, websocket)
                else:
                    await signal_manager.broadcast_except(msg, normalized_room_id, websocket)
                    
    except WebSocketDisconnect:
        signal_manager.disconnect(websocket, normalized_room_id)
        
        remaining_users = signal_manager.get_participant_count(normalized_room_id)
        if remaining_users == 0:
            async with AsyncSessionLocal() as db_session:
                await end_call_if_empty(db_session, normalized_room_id)
        
    except Exception as e:
        logger.error(f"Signal Error: {e}")
        signal_manager.disconnect(websocket, normalized_room_id)

app.include_router(protected_router)
app.include_router(internal_router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, workers=1)