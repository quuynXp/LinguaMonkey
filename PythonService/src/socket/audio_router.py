import json
import logging
import asyncio
import binascii
import time
import re
from typing import Dict
from collections import defaultdict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from src.core.azure_stt import AzureTranscriber
from src.core.connection_manager import audio_manager
from src.core.cache import get_redis_client
from src.core.translator import get_translator
from src.auth.auth_utils import validate_websocket_token

logger = logging.getLogger(__name__)
router = APIRouter()

# Config
RESET_BUFFER_TIMEOUT = 3.0
# Regex lọc từ đệm (Filler words) cho Tiếng Việt/Anh
FILLER_REGEX = re.compile(r'^(à|ờ|ừ|um|uh|hmm|ah|er|kiểu|thì|là)+$', re.IGNORECASE)

user_text_cache: Dict[str, str] = defaultdict(str)
user_last_speech_time: Dict[str, float] = defaultdict(float)
user_last_final_text: Dict[str, str] = defaultdict(str)

@router.websocket("/subtitles-audio")
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
    loop = asyncio.get_running_loop()

    async def handle_final_async(text: str, detected_lang_code: str):
        try:
            clean_text = text.strip()
            if not clean_text: return
            
            # 1. Filter Filler Words (Nếu chỉ toàn là filler -> đánh dấu isFiller)
            is_filler = bool(FILLER_REGEX.match(clean_text))
            display_text = "..." if is_filler else clean_text

            # 2. Anti-echo
            last_text = user_last_final_text[buffer_key]
            if not is_filler and clean_text.lower() == last_text.lower(): return
            user_last_final_text[buffer_key] = clean_text 

            # 3. Logic nối câu
            current_time = time.time()
            if user_last_speech_time[buffer_key] > 0 and (current_time - user_last_speech_time[buffer_key]) > RESET_BUFFER_TIMEOUT:
                user_text_cache[buffer_key] = ""
            
            user_last_speech_time[buffer_key] = current_time
            previous_text = user_text_cache[buffer_key]
            
            if previous_text and not previous_text.endswith(('.', '?', '!', '。')):
                new_full = (previous_text + " " + display_text).strip()
            else:
                new_full = display_text
            
            user_text_cache[buffer_key] = new_full
            if len(new_full) > 200: user_text_cache[buffer_key] = ""

            # 4. Gửi Original (Fast Path) - Client tự dịch LPM
            payload = {
                "type": "subtitle",
                "status": "complete",
                "senderId": user_id,
                "originalFull": new_full,
                "originalLang": detected_lang_code,
                "translated": "", # Client handle
                "isFiller": is_filler
            }
            await audio_manager.broadcast_subtitle(payload, normalized_room_id)

            # 5. Server Fallback Translation (Slow Path) - Chỉ chạy nếu ko phải filler
            if not is_filler:
                redis = await get_redis_client()
                translator = get_translator(redis)
                
                # Logic đơn giản: Dịch sang ngôn ngữ fallback nếu Client không tự dịch được
                # Trong thực tế, bạn có thể loop qua active_connections để lấy targetLang từng người
                target_lang = nativeLang or "vi"
                if target_lang != detected_lang_code:
                    trans_text, _ = await translator.translate(new_full, detected_lang_code, target_lang)
                    await audio_manager.broadcast_subtitle({
                        "type": "subtitle_translation",
                        "originalFull": new_full,
                        "translated": trans_text,
                        "targetLang": target_lang
                    }, normalized_room_id)

        except Exception as e:
            logger.error(f"Handle final error: {e}")

    # Sync Wrappers
    def handle_interim_sync(text: str, lang: str):
        # Interim cũng gửi để hiện realtime
        asyncio.run_coroutine_threadsafe(
            audio_manager.broadcast_subtitle({
                "type": "subtitle",
                "status": "processing",
                "senderId": user_id,
                "originalFull": text,
                "originalLang": lang,
                "isFiller": False
            }, normalized_room_id), 
            loop
        )

    def handle_final_sync(text: str, lang: str):
        asyncio.run_coroutine_threadsafe(handle_final_async(text, lang), loop)

    transcriber = AzureTranscriber(
        callback_final=handle_final_sync,
        callback_interim=handle_interim_sync,
        candidate_languages=["vi-VN", "en-US", "zh-CN", "ja-JP"]
    )
    transcriber.start()

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                msg_json = json.loads(data_str)
                
                # Handle Config Update
                if "config" in msg_json:
                    connections = audio_manager.active_connections[normalized_room_id]
                    for meta in connections:
                        if str(meta["user_id"]) == str(user_id):
                            meta["config"] = msg_json["config"]
                            if "nativeLang" in msg_json: meta["native_lang"] = msg_json["nativeLang"]
                            break
                    if not msg_json["config"].get("micEnabled", True): continue

                # Handle Audio
                b64_audio = msg_json.get("audio")
                if b64_audio:
                    pcm_data = binascii.a2b_base64(b64_audio)
                    transcriber.write_stream(pcm_data)

            except Exception: continue

    except WebSocketDisconnect:
        audio_manager.disconnect(websocket, normalized_room_id)
    except Exception:
        audio_manager.disconnect(websocket, normalized_room_id)
    finally:
        transcriber.stop()