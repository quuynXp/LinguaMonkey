import asyncio
import logging
import os
import json
from celery import Celery
from sqlalchemy import select, update, func, desc
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

# Import core modules
from src.core.cache import get_redis_client, close_redis_client
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal
from src.worker.huggingface_loader import ingest_huggingface_data

# Logger Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config Celery
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redisPass123")
REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:6379/0"

celery_app = Celery("lingua_worker", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
)

def run_async(coro):
    """Helper to run async code in sync Celery worker"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    return loop.run_until_complete(coro)

# ==============================================================================
#  TASK 1: INGEST DATA FROM HUGGING FACE
# ==============================================================================
@celery_app.task(name="src.worker.tasks.ingest_huggingface_task")
def ingest_huggingface_task():
    logger.info("🚀 [Celery] Starting Hugging Face Ingestion Task...")
    async def wrapper():
        redis = await get_redis_client()
        try:
            await ingest_huggingface_data(redis)
        except Exception as e:
            logger.error(f"Error inside wrapper: {e}")
            raise e
        finally:
            await close_redis_client()

    try:
        run_async(wrapper())
        logger.info("✅ [Celery] Hugging Face Ingestion Task Completed.")
        return "Success"
    except Exception as e:
        logger.error(f"❌ [Celery] Task Failed: {e}")
        return f"Failed: {str(e)}"

# ==============================================================================
#  TASK 2: RUNTIME SYNC (Save specific word to DB immediately)
# ==============================================================================
@celery_app.task(name="src.worker.tasks.sync_translation_to_db_task")
def sync_translation_to_db_task(original_text: str, src_lang: str, translations: dict):
    async def _logic():
        async with AsyncSessionLocal() as session:
            try:
                # Upsert Logic: Insert or Update on Conflict
                stmt = insert(TranslationLexicon).values(
                    original_text=original_text,
                    original_lang=src_lang,
                    translations=translations,
                    usage_count=1
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=['id'], # Note: Cần unique constraint ở original_text + original_lang nếu muốn chuẩn.
                    # Tuy nhiên, nếu model chưa có Unique Constraint composite, ta dùng logic Select-Update thủ công an toàn hơn:
                    set_={
                        "translations": translations,
                        "usage_count": TranslationLexicon.usage_count + 1,
                        "last_used_at": func.now()
                    }
                )
                
                # FALLBACK MANUAL CHECK (Vì bảng hiện tại id là PK, text/lang chưa chắc unique)
                # Để an toàn nhất với schema hiện tại:
                existing = await session.execute(
                    select(TranslationLexicon).where(
                        TranslationLexicon.original_text == original_text,
                        TranslationLexicon.original_lang == src_lang
                    )
                )
                lexicon_entry = existing.scalar_one_or_none()

                if lexicon_entry:
                    current_data = dict(lexicon_entry.translations) if lexicon_entry.translations else {}
                    current_data.update(translations)
                    lexicon_entry.translations = current_data
                    lexicon_entry.usage_count += 1
                    lexicon_entry.last_used_at = func.now()
                else:
                    new_entry = TranslationLexicon(
                        original_text=original_text,
                        original_lang=src_lang,
                        translations=translations,
                        usage_count=1
                    )
                    session.add(new_entry)
                
                await session.commit()
                logger.info(f"💾 Runtime Sync to DB: {original_text}")
            except Exception as e:
                logger.error(f"DB Sync Failed: {e}")
                await session.rollback()

    run_async(_logic())

# ==============================================================================
#  TASK 3: BACKUP REDIS TO DB (PERIODIC / TRIGGER)
# ==============================================================================
@celery_app.task(name="src.worker.tasks.backup_redis_to_db_task")
def backup_redis_to_db_task():
    """
    Quét Redis lấy các từ vựng (lex:*) và lưu vào DB.
    Giúp bảo toàn dữ liệu usage_count và các từ mới học được.
    """
    logger.info("💾 [Backup] Starting Redis -> DB Backup...")
    
    async def _logic():
        redis = await get_redis_client()
        async with AsyncSessionLocal() as session:
            cursor = b'0'
            count = 0
            batch_data = []
            BATCH_SIZE = 500

            while cursor:
                cursor, keys = await redis.scan(cursor, match="lex:*", count=1000)
                for key in keys:
                    # Key format: lex:{lang}:{text}
                    key_str = key.decode("utf-8")
                    parts = key_str.split(":")
                    if len(parts) < 3: continue
                    
                    lang = parts[1]
                    text = parts[2] # Đã normalized

                    # Lấy hash data
                    data = await redis.hgetall(key)
                    if not data: continue

                    # Convert Redis Hash (bytes/str) to Python Dict
                    translations = {}
                    usage = 0
                    
                    for k, v in data.items():
                        k_str = k.decode("utf-8")
                        v_str = v.decode("utf-8")
                        if k_str == "usage":
                            try:
                                usage = int(v_str)
                            except:
                                usage = 0
                        else:
                            translations[k_str] = v_str
                    
                    if not translations: continue

                    # Prepare batch upsert
                    # Vì SQLAlchemy async insert many hơi phức tạp với logic check exist,
                    # ta sẽ check từng cái hoặc dùng logic Insert on Conflict nếu DB support.
                    # Ở đây ta dùng logic đơn giản: Select -> Update/Insert
                    
                    # Để tối ưu performance, ta gom lại xử lý sau, nhưng ở đây demo loop đơn giản
                    # để đảm bảo tính đúng đắn với schema hiện tại.
                    stmt = select(TranslationLexicon).where(
                        TranslationLexicon.original_text == text,
                        TranslationLexicon.original_lang == lang
                    )
                    res = await session.execute(stmt)
                    entry = res.scalar_one_or_none()

                    if entry:
                        # Merge translations
                        current_trans = dict(entry.translations) if entry.translations else {}
                        current_trans.update(translations)
                        entry.translations = current_trans
                        # Update usage (lấy max để không bị giảm nếu DB lớn hơn)
                        entry.usage_count = max(entry.usage_count, usage)
                        entry.last_used_at = func.now()
                    else:
                        new_entry = TranslationLexicon(
                            original_text=text,
                            original_lang=lang,
                            translations=translations,
                            usage_count=usage
                        )
                        session.add(new_entry)
                    
                    count += 1
                    if count % BATCH_SIZE == 0:
                        await session.commit()
                        logger.info(f"   Saved {count} items...")

            await session.commit()
            logger.info(f"✅ Backup complete. Total items processed: {count}")

    run_async(_logic())

# ==============================================================================
#  TASK 4: RESTORE DB TO REDIS (WARM UP)
# ==============================================================================
@celery_app.task(name="src.worker.tasks.restore_db_to_redis_task")
def restore_db_to_redis_task():
    """
    Load Top N từ vựng được dùng nhiều nhất từ DB lên Redis.
    """
    logger.info("🔥 [Restore] Starting DB -> Redis Warmup...")
    
    async def _logic():
        redis = await get_redis_client()
        async with AsyncSessionLocal() as session:
            # Lấy 50,000 từ dùng nhiều nhất
            stmt = select(TranslationLexicon).order_by(
                desc(TranslationLexicon.usage_count)
            ).limit(50000)
            
            result = await session.execute(stmt)
            entries = result.scalars().all()
            
            pipeline = redis.pipeline()
            for entry in entries:
                key = f"lex:{entry.original_lang}:{entry.original_text}"
                
                mapping_data = dict(entry.translations) if entry.translations else {}
                mapping_data["usage"] = str(entry.usage_count) # Redis lưu số dạng string
                
                pipeline.hset(key, mapping=mapping_data)
                pipeline.expire(key, 60*60*24*30) # 30 ngày
            
            await pipeline.execute()
            logger.info(f"✅ Restored {len(entries)} 'hot' words to Redis.")

    run_async(_logic())