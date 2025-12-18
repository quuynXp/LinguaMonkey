import asyncio
import json
import logging
import uuid
from typing import Dict, List, Set

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from redis.asyncio import Redis

from src.core.session import AsyncSessionLocal
from src.core.models import ChatMessage, Room, RoomMember, User
from src.core.crypto_utils import aes_utils
from src.core.translator import get_translator
from src.core.cache import get_redis_client

logger = logging.getLogger(__name__)

TRANSLATION_QUEUE_KEY = "chat_translation_queue"
CONCURRENCY_LIMIT = 10

async def process_translation_task(redis: Redis, task_json: str, semaphore: asyncio.Semaphore):
    async with semaphore:
        try:
            if not task_json:
                logger.warning("⚠️ [Worker] Received empty task")
                return
            
            # Log raw để debug xem format Java gửi có đúng JSON string không
            logger.info(f"📥 [Worker] Raw Payload: {task_json}") 

            try:
                task = json.loads(task_json)
            except json.JSONDecodeError:
                logger.error(f"❌ [Worker] JSON Decode Error. Payload: {task_json[:100]}...")
                return

            message_id_str = task.get("messageId")
            room_id_str = task.get("roomId")
            encrypted_content = task.get("content")
            
            if not all([message_id_str, room_id_str, encrypted_content]):
                logger.warning(f"⚠️ [Worker] Missing fields in task: {task.keys()}")
                return

            logger.info(f"⚡ [Worker] Processing MsgID: {message_id_str}")
            
            async with AsyncSessionLocal() as db:
                # 1. Get Room Key
                room_uuid = uuid.UUID(room_id_str)
                room = (await db.execute(select(Room).where(Room.room_id == room_uuid))).scalar_one_or_none()
                
                if not room or not room.secret_key:
                    logger.error(f"❌ [Worker] Room Key Missing for {room_id_str}. Cannot Decrypt.")
                    return

                # 2. Decrypt
                decrypted_text = aes_utils.decrypt(encrypted_content, room.secret_key)
                if not decrypted_text:
                    logger.error(f"❌ [Worker] Decrypt Failed for msg {message_id_str}. Check key or vector.")
                    # Optional: Publish error event back to Redis for monitoring
                    await redis.publish(f"room_translation_error_{room_id_str}", json.dumps({
                        "messageId": message_id_str,
                        "error": "DECRYPTION_FAILED"
                    }))
                    return
                
                logger.info(f"🔓 [Worker] Decrypted: '{decrypted_text[:30]}...'")

                # 3. Get Targets
                members = (await db.execute(select(RoomMember).where(RoomMember.room_id == room_uuid))).scalars().all()
                target_langs = set()
                for m in members:
                    user = (await db.execute(select(User).where(User.user_id == m.user_id))).scalar_one_or_none()
                    if user and user.native_language_code:
                        target_langs.add(user.native_language_code)
                
                if not target_langs: 
                    logger.info("ℹ️ [Worker] No target langs found")
                    return

                # 4. Translate
                translator = get_translator(redis)
                translations = {}
                # Detect source lang first
                _, detected_lang = await translator.translate(decrypted_text, "auto", "auto")
                
                tasks = [translator.translate(decrypted_text, detected_lang, lang) for lang in target_langs if lang != detected_lang]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                valid_targets = [t for t in target_langs if t != detected_lang]
                for idx, res in enumerate(results):
                    if isinstance(res, tuple): 
                        translations[valid_targets[idx]] = res[0]
                    else:
                        logger.error(f"❌ Translate Error to {valid_targets[idx]}: {res}")

                if not translations: return

                # 5. Encrypt & Save
                encrypted_translations = {}
                for lang, text in translations.items():
                    enc = aes_utils.encrypt(text, room.secret_key)
                    if enc: encrypted_translations[lang] = enc

                msg_uuid = uuid.UUID(message_id_str)
                message = (await db.execute(select(ChatMessage).where(ChatMessage.chat_message_id == msg_uuid))).scalar_one_or_none()
                
                if message:
                    current = dict(message.translations) if message.translations else {}
                    current.update(encrypted_translations)
                    message.translations = current
                    flag_modified(message, "translations")
                    await db.commit()
                    
                    # 6. Notify
                    payload = {
                        "type": "TRANSLATION_UPDATE",
                        "id": message_id_str,
                        "roomId": room_id_str,
                        "translations": encrypted_translations
                    }
                    await redis.publish(f"room_translation_update_{room_id_str}", json.dumps(payload))
                    logger.info(f"✅ [Worker] Translated & Saved for {message_id_str}. Published update.")

        except Exception as e:
            logger.error(f"❌ [Worker] CRITICAL Exception: {e}", exc_info=True)

async def run_translation_worker():
    redis = await get_redis_client()
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    logger.info("🚀 [Worker] Consumer Started - Listening on Redis Queue...")
    while True:
        try:
            # BLPOP with decoding
            result = await redis.blpop(TRANSLATION_QUEUE_KEY, timeout=5)
            if result:
                _, task_data = result
                task_json = task_data.decode('utf-8') if isinstance(task_data, bytes) else task_data
                asyncio.create_task(process_translation_task(redis, task_json, semaphore))
        except Exception as e:
            logger.error(f"Worker Loop Error: {e}")
            await asyncio.sleep(1)