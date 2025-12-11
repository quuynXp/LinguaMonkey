import asyncio
import logging
import os
import json
from celery import Celery
from celery.signals import worker_ready
from sqlalchemy import select, update, func, desc
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from datasets import load_dataset # Cần cài thư viện datasets

from src.core.cache import get_redis_client, close_redis_client
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

# Lưu ý: Bạn có thể bỏ dòng import ingest_huggingface_loader cũ đi vì ta sẽ viết logic trực tiếp ở dưới
# from src.worker.huggingface_loader import ingest_huggingface_data 

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

# --- CẤU HÌNH DATASET & TỪ ĐIỂN THỦ CÔNG (ĐỂ FIX LỖI TỪ ĐƠN) ---
DATASET_SOURCES = [
    {
        "name": "Helsinki-NLP/opus-100",
        "config": "en-vi",
        "split": "train",
        "mapping": {"en": "en", "vi": "vi"},
        "limit": 150000 
    },
    {
        "name": "Helsinki-NLP/opus-100",
        "config": "en-zh",
        "split": "train",
        "mapping": {"en": "en", "zh": "zh"},
        "limit": 100000
    }
]

# Đây không phải fake data, đây là "Seed Data" để fix lỗi Opus-100 thiếu từ vựng cơ bản
COMMON_BASIC_WORDS = [
    {"en": "hello", "vi": "xin chào", "zh": "你好"},
    {"en": "hi", "vi": "chào", "zh": "嗨"},
    {"en": "love", "vi": "yêu", "zh": "爱"},
    {"en": "you", "vi": "bạn", "zh": "你"},
    {"en": "me", "vi": "tôi", "zh": "我"},
    {"en": "name", "vi": "tên", "zh": "名字"},
    {"en": "what", "vi": "cái gì", "zh": "什么"},
    {"en": "yes", "vi": "có", "zh": "是"},
    {"en": "no", "vi": "không", "zh": "不"},
    {"en": "thanks", "vi": "cảm ơn", "zh": "谢谢"},
]

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

# --- TRIGGER ON STARTUP ---
@worker_ready.connect
def trigger_startup_tasks(sender, **kwargs):
    """Tự động chạy task ingest khi worker khởi động"""
    with sender.app.connection() as conn:
        sender.app.send_task("src.worker.tasks.ingest_huggingface_task", connection=conn)
        logger.info("🚀 [Startup] Triggered ingest_huggingface_task automatically.")

# ==============================================================================
#  TASK 1: INGEST DATA (ĐÃ CẬP NHẬT LOGIC FIX LỖI HELLO)
# ==============================================================================
@celery_app.task(name="src.worker.tasks.ingest_huggingface_task")
def ingest_huggingface_task():
    logger.info("🚀 [Celery] Starting Hugging Face + Basic Dictionary Ingestion...")
    
    async def wrapper():
        redis = await get_redis_client()
        try:
            pipeline = redis.pipeline()
            
            # 1. Nạp từ điển thủ công trước (Ưu tiên cao để fix lỗi từ đơn)
            logger.info("🛠️ Ingesting Basic Dictionary (Hello, Love, etc.)...")
            for entry in COMMON_BASIC_WORDS:
                if "en" in entry and "vi" in entry:
                    # En -> Vi
                    pipeline.hset(get_redis_key("en", entry["en"]), mapping={"vi": entry["vi"]})
                    # Vi -> En
                    pipeline.hset(get_redis_key("vi", entry["vi"]), mapping={"en": entry["en"]})
                if "en" in entry and "zh" in entry:
                    pipeline.hset(get_redis_key("en", entry["en"]), mapping={"zh-CN": entry["zh"]})
                    pipeline.hset(get_redis_key("zh-CN", entry["zh"]), mapping={"en": entry["en"]})
            await pipeline.execute()

            # 2. Nạp HuggingFace
            total_processed = 0
            for source in DATASET_SOURCES:
                logger.info(f"📥 Loading dataset: {source['name']} ({source['config']})....")
                try:
                    # Chạy hàm synchronous load_dataset trong thread riêng để không chặn loop
                    dataset = await asyncio.to_thread(load_dataset, source['name'], source['config'], split=source['split'])
                    
                    if source.get("limit"):
                        limit = min(len(dataset), source["limit"])
                        dataset = dataset.select(range(limit))
                        
                    src_code = list(source["mapping"].keys())[0]
                    tgt_code = list(source["mapping"].keys())[1]
                    target_src_key = source["mapping"][src_code]
                    target_tgt_key = source["mapping"][tgt_code]

                    count = 0
                    batch_pipe = redis.pipeline()
                    
                    for row in dataset:
                        translation = row.get("translation", {})
                        text_src = translation.get(src_code, "")
                        text_tgt = translation.get(tgt_code, "")

                        if not text_src or not text_tgt: continue
                        
                        # Normalize & Save
                        key_src = get_redis_key(target_src_key, text_src.strip())
                        batch_pipe.hset(key_src, mapping={target_tgt_key: text_tgt.strip()})
                        batch_pipe.expire(key_src, 60 * 60 * 24 * 60)

                        key_tgt = get_redis_key(target_tgt_key, text_tgt.strip())
                        batch_pipe.hset(key_tgt, mapping={target_src_key: text_src.strip()})
                        batch_pipe.expire(key_tgt, 60 * 60 * 24 * 60)

                        count += 1
                        if count % 2000 == 0:
                            await batch_pipe.execute()
                    
                    await batch_pipe.execute()
                    total_processed += count
                    logger.info(f"✨ Processed {count} pairs from {source['config']}")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to load {source['name']}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error inside wrapper: {e}")
            raise e
        finally:
            await close_redis_client()

    try:
        run_async(wrapper())
        logger.info("✅ [Celery] Ingestion Completed Successfully.")
        return "Success"
    except Exception as e:
        logger.error(f"❌ [Celery] Task Failed: {e}")
        return f"Failed: {str(e)}"

# ==============================================================================
#  TASK 2: RUNTIME SYNC (GIỮ NGUYÊN CODE CỦA BẠN)
# ==============================================================================
@celery_app.task(name="src.worker.tasks.sync_translation_to_db_task")
def sync_translation_to_db_task(original_text: str, src_lang: str, translations: dict):
    async def _logic():
        async with AsyncSessionLocal() as session:
            try:
                # Logic Upsert của bạn giữ nguyên
                stmt = insert(TranslationLexicon).values(
                    original_text=original_text,
                    original_lang=src_lang,
                    translations=translations,
                    usage_count=1
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=['id'], # Đảm bảo DB có unique index hoặc dùng constraint name
                    set_={
                        "translations": translations,
                        "usage_count": TranslationLexicon.usage_count + 1,
                        "last_used_at": func.now()
                    }
                )
                
                # Fallback check nếu on_conflict fail do dialect
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
#  TASK 3: BACKUP REDIS TO DB (GIỮ NGUYÊN CODE CỦA BẠN)
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
                    # Fix: Nếu text có chứa dấu : thì phải join lại phần còn lại
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

                    # Update DB
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
#  TASK 4: RESTORE DB TO REDIS (GIỮ NGUYÊN CODE CỦA BẠN)
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