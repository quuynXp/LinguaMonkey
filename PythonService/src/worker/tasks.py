import asyncio
import logging
import os
from celery import Celery
from celery.signals import worker_ready
from sqlalchemy import select, func, desc
from sqlalchemy.dialects.postgresql import insert
from datasets import load_dataset 

from src.core.cache import get_redis_client, close_redis_client
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# --- CẤU HÌNH DATASET ---
DATASET_SOURCES = [
    # 1. Opus-100: Câu văn bản dài
    {
        "name": "Helsinki-NLP/opus-100",
        "config": "en-vi",
        "split": "train",
        "mapping": {"en": "en", "vi": "vi"},
        "limit": 100000 
    },
    {
        "name": "Helsinki-NLP/opus-100",
        "config": "en-zh",
        "split": "train",
        "mapping": {"en": "en", "zh": "zh"},
        "limit": 100000
    },
    # 2. Tatoeba: Câu ngắn, từ vựng giao tiếp
    {
        "name": "Helsinki-NLP/tatoeba_mt",
        "config": "eng-vie", 
        "split": "test",
        "mapping": {"eng": "en", "vie": "vi"},
        "limit": 50000 
    },
    {
        "name": "Helsinki-NLP/tatoeba_mt",
        "config": "eng-zho", 
        "split": "test",
        "mapping": {"eng": "en", "zho": "zh-CN"}, 
        "limit": 50000
    }
]

# Đổi key version để bắt buộc chạy lại việc nạp dữ liệu
INGESTION_FLAG_KEY = "system:hf_ingestion_complete_v203" 

def normalize_text(text: str) -> str:
    if not text: return ""
    return text.strip().lower()

def get_redis_key(lang: str, text: str) -> str:
    return f"lex:{lang}:{normalize_text(text)}"

def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@worker_ready.connect
def trigger_startup_tasks(sender, **kwargs):
    with sender.app.connection() as conn:
        sender.app.send_task("src.worker.tasks.ingest_huggingface_task", connection=conn)
        logger.info("🚀 [Startup] Triggered ingest task.")

# ==============================================================================
#  TASK 1: INGEST DATA
# ==============================================================================
@celery_app.task(name="src.worker.tasks.ingest_huggingface_task")
def ingest_huggingface_task():
    logger.info("🚀 [Celery] Starting Ingestion (Opus + Tatoeba)...")
    async def wrapper():
        redis = await get_redis_client()
        try:
            if await redis.exists(INGESTION_FLAG_KEY):
                logger.info(f"⚡ [SKIP] Data already ingested ({INGESTION_FLAG_KEY}).")
                return

            pipeline = redis.pipeline()
            total_processed = 0

            for source in DATASET_SOURCES:
                logger.info(f"📥 Loading dataset: {source['name']} ({source['config']})....")
                try:
                    # Tải dataset (ĐÃ XÓA trust_remote_code=True)
                    dataset = await asyncio.to_thread(
                        load_dataset, 
                        source['name'], 
                        source['config'], 
                        split=source['split']
                        # trust_remote_code=True # <-- Đã bỏ, vì gây lỗi cho Opus-100
                    )
                    
                    if source.get("limit"):
                        limit = min(len(dataset), source["limit"])
                        dataset = dataset.select(range(limit))

                    logger.info(f"✅ Loaded {len(dataset)} rows. Processing...")
                    
                    # Xác định key source/target
                    # Sử dụng mapping keys từ config để linh hoạt với các dataset khác nhau
                    src_lang_dataset = list(source["mapping"].keys())[0] # vd: eng
                    tgt_lang_dataset = list(source["mapping"].keys())[1] # vd: vie
                    
                    src_lang_redis = source["mapping"][src_lang_dataset] # vd: en
                    tgt_lang_redis = source["mapping"][tgt_lang_dataset] # vd: vi

                    count = 0
                    pipe_batch = redis.pipeline()

                    for row in dataset:
                        # Logic bóc tách dữ liệu từ row
                        tr = row.get("translation", {})
                        s_text = tr.get(src_lang_dataset, "")
                        t_text = tr.get(tgt_lang_dataset, "")
                        
                        if not s_text or not t_text: continue
                        
                        s_clean = s_text.strip()
                        t_clean = t_text.strip()

                        # Lưu Redis (2 chiều)
                        key_src = get_redis_key(src_lang_redis, s_clean)
                        pipe_batch.hset(key_src, mapping={tgt_lang_redis: t_clean})
                        pipe_batch.expire(key_src, 60 * 60 * 24 * 60)

                        key_tgt = get_redis_key(tgt_lang_redis, t_clean)
                        pipe_batch.hset(key_tgt, mapping={src_lang_redis: s_clean})
                        pipe_batch.expire(key_tgt, 60 * 60 * 24 * 60)

                        count += 1
                        if count % 2000 == 0:
                            await pipe_batch.execute()
                    
                    await pipe_batch.execute()
                    total_processed += count
                    logger.info(f"✨ Ingested {count} pairs from {source['config']}")

                except Exception as e:
                    logger.error(f"❌ Failed source {source['name']} ({source['config']}): {e}")
                    continue

            if total_processed > 0:
                await redis.set(INGESTION_FLAG_KEY, "1")
                logger.info(f"🎉 Total ingested: {total_processed} pairs.")
            else:
                logger.warning("⚠️ No data ingested.")

        except Exception as e:
            logger.error(f"Ingestion Error: {e}")
        finally:
            await close_redis_client()

    run_async(wrapper())

# ==============================================================================
#  TASK 2: DB SYNC
# ==============================================================================
@celery_app.task(name="src.worker.tasks.sync_translation_to_db_task")
def sync_translation_to_db_task(original_text: str, src_lang: str, translations: dict):
    async def _logic():
        async with AsyncSessionLocal() as session:
            try:
                stmt = insert(TranslationLexicon).values(
                    original_text=original_text,
                    original_lang=src_lang,
                    translations=translations,
                    usage_count=1
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=['id'], 
                    set_={
                        "translations": translations,
                        "usage_count": TranslationLexicon.usage_count + 1,
                        "last_used_at": func.now()
                    }
                )
                # Fallback an toàn
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
                logger.info(f"💾 DB Sync: {original_text}")
            except Exception as e:
                logger.error(f"DB Sync Failed: {e}")
                await session.rollback()

    run_async(_logic())

# ==============================================================================
#  TASK 3: BACKUP REDIS TO DB
# ==============================================================================
@celery_app.task(name="src.worker.tasks.backup_redis_to_db_task")
def backup_redis_to_db_task():
    logger.info("💾 [Backup] Starting Redis -> DB Backup...")
    
    async def _logic():
        redis = await get_redis_client()
        async with AsyncSessionLocal() as session:
            cursor = b'0'
            count = 0
            BATCH_SIZE = 500

            while cursor:
                cursor, keys = await redis.scan(cursor, match="lex:*", count=1000)
                for key in keys:
                    key_str = key.decode("utf-8")
                    parts = key_str.split(":")
                    if len(parts) < 3: continue
                    
                    lang = parts[1]
                    # Ghép lại text vì text có thể chứa dấu :
                    text = ":".join(parts[2:])

                    data = await redis.hgetall(key)
                    if not data: continue

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

                    # Tìm và cập nhật DB
                    stmt = select(TranslationLexicon).where(
                        TranslationLexicon.original_text == text,
                        TranslationLexicon.original_lang == lang
                    )
                    res = await session.execute(stmt)
                    entry = res.scalar_one_or_none()

                    if entry:
                        current_trans = dict(entry.translations) if entry.translations else {}
                        current_trans.update(translations)
                        entry.translations = current_trans
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
#  TASK 4: RESTORE DB TO REDIS
# ==============================================================================
@celery_app.task(name="src.worker.tasks.restore_db_to_redis_task")
def restore_db_to_redis_task():
    logger.info("🔥 [Restore] Starting DB -> Redis Warmup...")
    
    async def _logic():
        redis = await get_redis_client()
        async with AsyncSessionLocal() as session:
            stmt = select(TranslationLexicon).order_by(
                desc(TranslationLexicon.usage_count)
            ).limit(50000)
            
            result = await session.execute(stmt)
            entries = result.scalars().all()
            
            pipeline = redis.pipeline()
            for entry in entries:
                key = f"lex:{entry.original_lang}:{normalize_text(entry.original_text)}"
                mapping_data = dict(entry.translations) if entry.translations else {}
                mapping_data["usage"] = str(entry.usage_count)
                
                pipeline.hset(key, mapping=mapping_data)
                pipeline.expire(key, 60*60*24*30)
            
            await pipeline.execute()
            logger.info(f"✅ Restored {len(entries)} 'hot' words to Redis.")

    run_async(_logic())