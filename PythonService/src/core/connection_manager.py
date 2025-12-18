import logging
import asyncio
import json
from collections import defaultdict
from typing import Optional, Set, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections = defaultdict(list)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None, native_lang: str = None):
        await websocket.accept()
        lang_code = (native_lang or "vi").split('-')[0].lower()
        
        meta = {
            "ws": websocket, 
            "user_id": str(user_id), 
            "native_lang": lang_code,
            "config": {"subtitleMode": "dual", "micEnabled": True}
        }
        self.active_connections[room_id].append(meta)
        logger.info(f"✅ WS CONNECTED: Room={room_id} | User={user_id} | Lang={lang_code}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                m for m in self.active_connections[room_id] if m["ws"] != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    def get_required_languages(self, room_id: str) -> Set[str]:
        """
        Lấy danh sách các ngôn ngữ native duy nhất đang có trong phòng.
        Dùng Set để loại bỏ trùng lặp (100 người Việt -> chỉ cần 1 lần dịch 'vi').
        """
        if room_id not in self.active_connections:
            return set()
        
        languages = set()
        for meta in self.active_connections[room_id]:
            mode = meta.get("config", {}).get("subtitleMode", "dual")
            if mode != "off":
                languages.add(meta.get("native_lang", "vi"))
        
        return languages

    async def broadcast_subtitle(self, 
                               original_full: str, 
                               detected_lang: str, 
                               room_id: str, 
                               sender_id: str, 
                               is_final: bool = False,
                               translations: dict = None,
                               exclude_ws: WebSocket = None):
        
        if room_id not in self.active_connections: return
        
        payload = {
            "type": "subtitle",
            "originalFull": original_full,
            "originalLang": detected_lang,
            "translations": translations or {},
            "senderId": sender_id,
            "status": "complete" if is_final else "processing",
            "isFiller": False
        }

        msg_json = json.dumps(payload, ensure_ascii=False)
        tasks = []

        for meta in self.active_connections[room_id]:
            ws = meta["ws"]
            if exclude_ws and ws == exclude_ws: continue
            
            user_config = meta.get("config", {})
            mode = user_config.get("subtitleMode", "dual")

            if mode == "off":
                continue

            tasks.append(self._safe_send(ws, msg_json))
        
        if tasks: await asyncio.gather(*tasks)

    async def broadcast_except(self, message: dict, room_id: str, exclude_ws: WebSocket):
        if room_id in self.active_connections:
            data = json.dumps(message)
            tasks = []
            for meta in self.active_connections[room_id]:
                ws = meta["ws"]
                if ws is exclude_ws: continue
                tasks.append(self._safe_send(ws, data))
            if tasks: await asyncio.gather(*tasks)

    def get_participant_count(self, room_id: str) -> int:
        return len(self.active_connections.get(room_id, []))

    async def _safe_send(self, ws: WebSocket, data: str):
        try:
            await ws.send_text(data)
        except Exception:
            pass

audio_manager = ConnectionManager()
signal_manager = ConnectionManager()