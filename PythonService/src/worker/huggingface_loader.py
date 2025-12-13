import logging
import json
import asyncio
import re
import string
from typing import List, Dict
from datasets import load_dataset
from redis.asyncio import Redis
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert 

from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATASET_SOURCES = [
    {
        "name": "Helsinki-NLP/opus-100",
        "config": "en-vi",
        "split": "train",
        "mapping": {"en": "en", "vi": "vi"}, 
        "limit": 500000
    },
    {
        "name": "Helsinki-NLP/opus-100",
        "config": "en-zh",
        "split": "train",
        "mapping": {"en": "en", "zh": "zh-CN"},
        "limit": 500000
    }
]

BATCH_SIZE = 2000
INGESTION_FLAG_KEY = "system:hf_ingestion_complete_v10" 

def normalize_text(text: str) -> str:
    if not text: return ""
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip().lower()

def get_redis_key(lang: str, text: str) -> str:
    return f"lex:{lang}:{normalize_text(text)}"

async def ingest_huggingface_data(redis: Redis):
    async with AsyncSessionLocal() as db:
        try:
            # if await redis.exists(INGESTION_FLAG_KEY):
            #     logger.info(f"⚡ [SKIP] Hugging Face data already ingested.")
            #     return

            pipeline = redis.pipeline()
            total_processed = 0
            MAX_ITEMS_PER_LANG = 50000

            for source in DATASET_SOURCES:
                logger.info(f"📥 Loading dataset: {source['name']} ({source['config']})....")
                
                try:
                    dataset = await asyncio.to_thread(
                        load_dataset, 
                        source['name'], 
                        source['config'], 
                        split=source['split'],
                        verification_mode="no_checks"
                    )
                except Exception as e:
                    logger.error(f"❌ Failed to load {source['name']}: {e}")
                    continue
                
                if source.get("limit"):
                    limit = min(len(dataset), source["limit"])
                    dataset = dataset.select(range(limit))

                logger.info(f"✅ Loaded {len(dataset)} rows. Filtering short phrases...")
                
                src_code = list(source["mapping"].keys())[0]
                tgt_code = list(source["mapping"].keys())[1]
                
                target_src_key = source["mapping"][src_code]
                target_tgt_key = source["mapping"][tgt_code]

                count = 0
                db_batch = [] 

                for row in dataset:
                    if count >= MAX_ITEMS_PER_LANG:
                        break

                    translation = row.get("translation", {})
                    text_src = translation.get(src_code, "")
                    text_tgt = translation.get(tgt_code, "")

                    if not text_src or not text_tgt: continue
                    
                    text_src = text_src.strip()
                    text_tgt = text_tgt.strip()

                    if len(text_src.split()) > 10:
                        continue

                    # --- REDIS ---
                    key_src = get_redis_key(target_src_key, text_src)
                    pipeline.hset(key_src, mapping={target_tgt_key: text_tgt})
                    
                    key_tgt = get_redis_key(target_tgt_key, text_tgt)
                    pipeline.hset(key_tgt, mapping={target_src_key: text_src})
                    
                    # --- DB PREPARE ---
                    db_batch.append({
                        "original_text": text_src,
                        "original_lang": target_src_key,
                        "translations": {target_tgt_key: text_tgt},
                        "usage_count": 100 # Đặt usage cao để ưu tiên load vào client
                    })

                    count += 1
                    
                    if count % BATCH_SIZE == 0:
                        await pipeline.execute()
                        
                        stmt = insert(TranslationLexicon).values(db_batch)
                        stmt = stmt.on_conflict_do_nothing(index_elements=['original_text', 'original_lang'])
                        await db.execute(stmt)
                        await db.commit()
                        
                        db_batch = [] 

                if db_batch:
                    stmt = insert(TranslationLexicon).values(db_batch)
                    stmt = stmt.on_conflict_do_nothing(index_elements=['original_text', 'original_lang'])
                    await db.execute(stmt)
                    await db.commit()
                
                await pipeline.execute()
                total_processed += count
                logger.info(f"✨ Processed {count} short phrases/words from {source['config']}")

            if total_processed > 0:
                await redis.set(INGESTION_FLAG_KEY, "1")
                logger.info(f"🎉 Total ingested: {total_processed} pairs via Redis & DB.")
        
        except Exception as e:
            logger.error(f"❌ Ingestion failed: {e}", exc_info=True)
            await db.rollback()
            raise e