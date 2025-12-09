import logging
import json
import asyncio
from typing import List, Dict
from datasets import load_dataset
from redis.asyncio import Redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

BATCH_SIZE = 2000
REDIS_EXPIRY = 60 * 60 * 24 * 60
INGESTION_FLAG_KEY = "system:hf_ingestion_complete_v4" 

def normalize_text(text: str) -> str:
    if not text: return ""
    return text.strip().lower()

def get_redis_key(lang: str, text: str) -> str:
    return f"lex:{lang}:{normalize_text(text)}"

async def clean_old_lexicon_keys(redis: Redis):
    """
    Hàm dọn dẹp toàn bộ key lex:* cũ (dạng String) để tránh lỗi WRONGTYPE
    khi chuyển sang dùng Hash.
    """
    logger.info("🧹 scanning and cleaning old 'lex:*' keys to prevent collision...")
    cursor = b"0"
    count = 0
    keys_to_delete = []
    
    async for key in redis.scan_iter(match="lex:*"):
        keys_to_delete.append(key)
        if len(keys_to_delete) >= 5000:
            await redis.delete(*keys_to_delete)
            count += len(keys_to_delete)
            keys_to_delete = []
            logger.info(f"   ...cleaned {count} keys")
            
    if keys_to_delete:
        await redis.delete(*keys_to_delete)
        count += len(keys_to_delete)
        
    logger.info(f"✨ Cleaned total {count} old keys. Redis is ready for Hash structure.")

async def ingest_huggingface_data(redis: Redis):
    try:
        if await redis.exists(INGESTION_FLAG_KEY):
            logger.info(f"⚡ [SKIP] Hugging Face data already ingested (Key: {INGESTION_FLAG_KEY}).")
            return
        
        await clean_old_lexicon_keys(redis)

        pipeline = redis.pipeline()
        total_processed = 0

        for source in DATASET_SOURCES:
            logger.info(f"📥 Loading dataset: {source['name']} ({source['config']})...")
            
            try:
                dataset = await asyncio.to_thread(
                    load_dataset, 
                    source['name'], 
                    source['config'], 
                    split=source['split']
                )
            except Exception as e:
                logger.error(f"❌ Failed to load {source['name']}: {e}")
                continue
            
            if source.get("limit"):
                limit = min(len(dataset), source["limit"])
                dataset = dataset.select(range(limit))

            logger.info(f"✅ Loaded {len(dataset)} rows. Pushing to Redis Hash...")
            
            src_code = list(source["mapping"].keys())[0] # en
            tgt_code = list(source["mapping"].keys())[1] # vi/zh
            
            target_src_key = source["mapping"][src_code] 
            target_tgt_key = source["mapping"][tgt_code]

            count = 0
            for row in dataset:
                translation = row.get("translation", {})
                text_src = translation.get(src_code, "")
                text_tgt = translation.get(tgt_code, "")

                if not text_src or not text_tgt:
                    continue
                
                # Normalize
                text_src = text_src.strip()
                text_tgt = text_tgt.strip()

                # 1. Chiều Xuôi (VD: en -> vi)
                key_src = get_redis_key(target_src_key, text_src)
                pipeline.hset(key_src, mapping={target_tgt_key: text_tgt})
                pipeline.expire(key_src, REDIS_EXPIRY)

                # 2. Chiều Ngược (VD: vi -> en)
                key_tgt = get_redis_key(target_tgt_key, text_tgt)
                pipeline.hset(key_tgt, mapping={target_src_key: text_src})
                pipeline.expire(key_tgt, REDIS_EXPIRY)

                count += 1
                if count % BATCH_SIZE == 0:
                    await pipeline.execute()
            
            await pipeline.execute() 
            total_processed += count
            logger.info(f"✨ Processed {count} pairs from {source['config']}")

        if total_processed > 0:
            await redis.set(INGESTION_FLAG_KEY, "1")
            logger.info(f"🎉 Total ingested: {total_processed} pairs via Redis Hash.")
        else:
            logger.warning("⚠️ No data ingested. Flag not set.")
    
    except Exception as e:
        logger.error(f"❌ Ingestion failed: {e}", exc_info=True)
        raise e