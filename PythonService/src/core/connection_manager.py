import logging
import asyncio
import json
from collections import defaultdict
from typing import Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections = defaultdict(list)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str = None, native_lang: str = None):
        await websocket.accept()
        meta = {
            "ws": websocket, 
            "user_id": str(user_id), 
            "native_lang": (native_lang or "vi"),
            "config": {"subtitleMode": "dual", "micEnabled": True}
        }
        self.active_connections[room_id].append(meta)
        logger.info(f"✅ WS CONNECTED: Room={room_id} | User={user_id}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                m for m in self.active_connections[room_id] if m["ws"] != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_subtitle(self, 
                               original_full: str, 
                               detected_lang: str, 
                               room_id: str, 
                               sender_id: str, 
                               is_final: bool = False,
                               exclude_ws: WebSocket = None):
        
        if room_id not in self.active_connections: return
        
        payload = {
            "type": "subtitle",
            "originalFull": original_full,
            "originalLang": detected_lang,
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