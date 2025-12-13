import json
import logging
import asyncio
import time
import uuid
import binascii
from collections import defaultdict
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

from src.core.azure_stt import AzureTranscriber
from src.core.translator import get_translator
from src.core.cache import get_redis_client
from src.core.text_processor import text_processor

logger = logging.getLogger(__name__)

# Constants
RESET_BUFFER_TIMEOUT = 3.0 
MAX_SENTENCE_LENGTH = 200

class AudioConnectionManager:
    def __init__(self):
        # active_connections: { room_id: [ {ws, user_id, ...} ] }
        self.active_connections = defaultdict(list)
        # Caches để xử lý nối câu và anti-echo
        self.user_text_cache: Dict[str, str] = defaultdict(str)
        self.user_last_speech_time: Dict[str, float] = defaultdict(float)
        self.user_last_final_text: Dict[str, str] = defaultdict(str)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, native_lang: str = "vi"):
        await websocket.accept()
        meta = {
            "ws": websocket, 
            "user_id": str(user_id), 
            "native_lang": native_lang,
            "config": {"subtitleMode": "dual", "micEnabled": True}
        }
        self.active_connections[room_id].append(meta)
        logger.info(f"🎤 AUDIO SOCKET: User {user_id} joined Room {room_id}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                m for m in self.active_connections[room_id] if m["ws"] != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                # Clean up caches for this room (Optional: clear per user logic needed via key)

    async def _safe_send(self, ws: WebSocket, data: str):
        try:
            await ws.send_text(data)
        except Exception:
            pass # Socket likely dead, will be cleaned up by disconnect logic

    async def broadcast_subtitle(self, payload: dict, room_id: str, exclude_ws: WebSocket = None):
        """
        Gửi payload tới tất cả user trong phòng (trừ người nói nếu cần).
        """
        if room_id not in self.active_connections: 
            return

        msg_json = json.dumps(payload, ensure_ascii=False)
        tasks = []
        for meta in self.active_connections[room_id]:
            ws = meta["ws"]
            config = meta.get("config", {})
            
            # Nếu user tắt subtitle, không gửi
            if config.get("subtitleMode") == "off":
                continue
                
            if exclude_ws and ws == exclude_ws:
                continue
                
            tasks.append(self._safe_send(ws, msg_json))
        
        if tasks:
            await asyncio.gather(*tasks)

    async def process_audio_stream(self, websocket: WebSocket, room_id: str, user_id: str, native_lang: str):
        """
        Xử lý stream audio từ Client -> Azure STT -> Broadcast Text.
        """
        normalized_room_id = str(room_id).strip().lower()
        buffer_key = f"{normalized_room_id}_{user_id}"
        
        loop = asyncio.get_running_loop()

        # --- LOGIC XỬ LÝ TEXT (CORE) ---
        async def handle_text_logic(text: str, detected_lang: str, is_final: bool):
            clean_text = text_processor.normalize_text(text)
            if not clean_text: return

            # 1. Filler Word Check
            # Nếu là câu Final và chỉ toàn từ đệm -> Gom về "..."
            if is_final:
                processed_text = text_processor.simplify_filler_display(clean_text, detected_lang)
            else:
                processed_text = clean_text

            # Nếu text rỗng hoặc chỉ là "..." và đang interim -> bỏ qua để đỡ spam UI
            if not is_final and (not processed_text or processed_text == "..."):
                return

            # 2. Logic Nối câu & Anti-Echo (Chỉ áp dụng cho Final)
            if is_final:
                last_text = self.user_last_final_text[buffer_key]
                # Anti-echo đơn giản
                if processed_text.lower() == last_text.lower(): return
                
                self.user_last_final_text[buffer_key] = processed_text
                
                # Logic nối câu
                current_time = time.time()
                if self.user_last_speech_time[buffer_key] > 0 and (current_time - self.user_last_speech_time[buffer_key]) > RESET_BUFFER_TIMEOUT:
                    self.user_text_cache[buffer_key] = ""
                
                self.user_last_speech_time[buffer_key] = current_time
                previous = self.user_text_cache[buffer_key]
                
                if previous and not previous.endswith(('.', '?', '!', '。')):
                     processed_full = (previous + " " + processed_text).strip()
                else:
                     processed_full = processed_text
                
                self.user_text_cache[buffer_key] = processed_full
                
                # Reset buffer nếu quá dài
                if processed_full.endswith(('.', '?', '!', '。')) or len(processed_full) > MAX_SENTENCE_LENGTH:
                    self.user_text_cache[buffer_key] = ""
            else:
                processed_full = processed_text

            # 3. Chuẩn bị Payload
            # Gửi NGAY LẬP TỨC bản gốc (original) để Client tự xử lý LPM
            payload = {
                "type": "subtitle",
                "status": "complete" if is_final else "processing",
                "senderId": user_id,
                "originalFull": processed_full, # Client sẽ dùng cái này để LPM
                "originalLang": detected_lang,
                "translated": "", # Để trống, Client tự fill nếu LPM hit
                "isFiller": processed_full == "..." 
            }

            # Broadcast Original trước (Fast Path)
            await self.broadcast_subtitle(payload, normalized_room_id)

            # 4. Fallback Backend Translation (Slow Path)
            # Chỉ chạy khi Final và không phải là filler words
            if is_final and processed_full != "...":
                redis = await get_redis_client()
                translator = get_translator(redis)
                
                # Gom nhóm ngôn ngữ cần dịch (như logic cũ)
                target_langs = set()
                for meta in self.active_connections[normalized_room_id]:
                    # Lấy ngôn ngữ đích của người nhận
                    recv_lang = meta.get("native_lang", "vi").split('-')[0]
                    src_lang = detected_lang.split('-')[0]
                    if recv_lang != src_lang:
                        target_langs.add(recv_lang)
                
                # Dịch song song
                async def run_translation(target):
                    try:
                        t_text, _ = await translator.translate(processed_full, detected_lang, target)
                        # Gửi bản dịch riêng cho từng nhóm ngôn ngữ (Logic này có thể tối ưu hơn ở level socket, 
                        # nhưng ở đây ta gửi broadcast update có kèm targetLang để client lọc)
                        trans_payload = {
                            "type": "subtitle_translation", # Type mới để update bản dịch
                            "originalFull": processed_full, # Key để map
                            "senderId": user_id,
                            "translated": t_text,
                            "targetLang": target
                        }
                        await self.broadcast_subtitle(trans_payload, normalized_room_id)
                    except Exception as e:
                        logger.error(f"Trans fail: {e}")

                if target_langs:
                    asyncio.create_task(asyncio.gather(*[run_translation(t) for t in target_langs]))


        # --- WRAPPERS FOR AZURE CALLBACKS ---
        def on_interim(text: str, lang: str):
            asyncio.run_coroutine_threadsafe(handle_text_logic(text, lang, False), loop)

        def on_final(text: str, lang: str):
            asyncio.run_coroutine_threadsafe(handle_text_logic(text, lang, True), loop)

        # Khởi tạo Transcriber
        transcriber = AzureTranscriber(
            callback_final=on_final,
            callback_interim=on_interim,
            candidate_languages=["vi-VN", "en-US", "zh-CN", "ja-JP"] # Có thể lấy từ User Profile
        )
        transcriber.start()

        try:
            while True:
                data_str = await websocket.receive_text()
                try:
                    msg_json = json.loads(data_str)
                    
                    # Update Config (Mic/Subtitle Mode)
                    if "config" in msg_json:
                        connections = self.active_connections[normalized_room_id]
                        for meta in connections:
                            if str(meta["user_id"]) == str(user_id):
                                meta["config"] = msg_json["config"]
                                break
                        # Nếu user tắt mic, bỏ qua xử lý audio
                        if not msg_json["config"].get("micEnabled", True): continue
                    
                    # Process Audio Data
                    current_meta = next((m for m in self.active_connections[normalized_room_id] if str(m["user_id"]) == str(user_id)), None)
                    if current_meta and not current_meta.get("config", {}).get("micEnabled", True):
                        continue

                    b64_audio = msg_json.get("audio")
                    if b64_audio:
                        pcm_data = binascii.a2b_base64(b64_audio)
                        transcriber.write_stream(pcm_data)

                except Exception:
                    continue
                    
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"WS Audio Error: {e}")
        finally:
            transcriber.stop()
            self.disconnect(websocket, normalized_room_id)

audio_manager = AudioConnectionManager()