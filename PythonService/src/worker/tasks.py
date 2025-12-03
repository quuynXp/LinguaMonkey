import asyncio
import json
import logging
import os
from sqlalchemy import select, update, func
from sqlalchemy.dialects.postgresql import insert
from deep_translator import GoogleTranslator
from src.worker.celery_app import celery_app
from src.core.cache import get_redis_client
from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

DATA_FILE_PATH = "/app/PythonService/src/data/dictionary.csv"

def run_async(coro):
    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task
def sync_translation_to_db_task(original_text: str, src_lang: str, translations: dict):
    async def _logic():
        async with AsyncSessionLocal() as session:
            try:
                stmt = select(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                )
                result = await session.execute(stmt)
                lexicon_entry = result.scalar_one_or_none()

                if lexicon_entry:
                    current_data = dict(lexicon_entry.translations)
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
                logger.info(f"Saved to DB: {original_text} -> {translations}")
            except Exception as e:
                logger.error(f"DB Sync Failed: {e}")
                await session.rollback()

    run_async(_logic())

@celery_app.task
def update_usage_stats_task(original_text: str, src_lang: str):
    async def _logic():
        async with AsyncSessionLocal() as session:
            try:
                stmt = update(TranslationLexicon).where(
                    TranslationLexicon.original_text == original_text,
                    TranslationLexicon.original_lang == src_lang
                ).values(
                    usage_count=TranslationLexicon.usage_count + 1,
                    last_used_at=func.now()
                )
                await session.execute(stmt)
                await session.commit()
            except Exception as e:
                logger.error(f"Update Stats Failed: {e}")

    run_async(_logic())

@celery_app.task
def warm_up_redis_task():
    async def _logic():
        redis = get_redis_client()
        async with AsyncSessionLocal() as session:
            try:
                stmt = select(TranslationLexicon).order_by(
                    TranslationLexicon.usage_count.desc()
                ).limit(10000)
                result = await session.execute(stmt)
                entries = result.scalars().all()

                pipeline = redis.pipeline()
                for entry in entries:
                    key = f"lex:{entry.original_lang}:{entry.original_text.strip().lower()}"
                    pipeline.set(key, json.dumps(entry.translations))
                
                await pipeline.execute()
                logger.info(f"Warmed up Redis with {len(entries)} keys.")
            except Exception as e:
                logger.error(f"Warm-up Failed: {e}")

    run_async(_logic())

@celery_app.task
def evict_unused_redis_keys_task():
    async def _logic():
        redis = get_redis_client()
        async with AsyncSessionLocal() as session:
            stmt = select(TranslationLexicon).where(
                TranslationLexicon.usage_count < 5
            ).limit(1000) 
            
            result = await session.execute(stmt)
            entries = result.scalars().all()
            
            if not entries: return

            keys_to_delete = [
                f"lex:{e.original_lang}:{e.original_text.strip().lower()}" 
                for e in entries
            ]
            
            if keys_to_delete:
                await redis.delete(*keys_to_delete)
                logger.info(f"Evicted {len(keys_to_delete)} unused keys from Redis.")

    run_async(_logic())

@celery_app.task
def populate_lexicon_from_community_task():
    async def _logic():
        async with AsyncSessionLocal() as session:
            stmt = select(TranslationLexicon).order_by(
                TranslationLexicon.last_used_at.desc()
            ).limit(50)
            
            result = await session.execute(stmt)
            entries = result.scalars().all()
            
            updated_count = 0
            for entry in entries:
                current_trans = dict(entry.translations)
                src = entry.original_lang
                original = entry.original_text
                
                targets = {'vi', 'en', 'zh'} - {src}
                missing = [t for t in targets if t not in current_trans]
                
                if missing:
                    try:
                        translator = GoogleTranslator(source=src, target=missing[0])
                        translated_text = translator.translate(original)
                        
                        if translated_text:
                            current_trans[missing[0]] = translated_text
                            entry.translations = current_trans
                            updated_count += 1
                            sync_translation_to_db_task.delay(original, src, current_trans)
                    except Exception as e:
                        logger.warning(f"Community Fetch Error for {original}: {e}")
                        continue
            
            if updated_count > 0:
                await session.commit()
                logger.info(f"Augmented {updated_count} words using Community API.")

    run_async(_logic())

@celery_app.task
def seed_dictionary_csv_task():
    async def _logic():
        if not os.path.exists(DATA_FILE_PATH):
            logger.error(f"File not found: {DATA_FILE_PATH}")
            return

        async with AsyncSessionLocal() as session:
            batch_size = 5000
            batch_data = []
            total_inserted = 0

            with open(DATA_FILE_PATH, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    parts = line.strip().split('\t')
                    if len(parts) < 2:
                        parts = line.strip().split(',')
                    
                    if len(parts) >= 2:
                        original = parts[0].strip().lower()
                        translated = parts[1].strip()
                        
                        if len(original) > 1 and len(translated) > 1:
                            batch_data.append({
                                "original_text": original,
                                "original_lang": "vi",
                                "translations": {"en": translated},
                                "usage_count": 100, 
                                "last_used_at": "2025-01-01 00:00:00"
                            })

                    if len(batch_data) >= batch_size:
                        stmt = insert(TranslationLexicon).values(batch_data)
                        stmt = stmt.on_conflict_do_nothing(
                            index_elements=['original_text', 'original_lang']
                        )
                        await session.execute(stmt)
                        await session.commit()
                        total_inserted += len(batch_data)
                        logger.info(f"Inserted batch: {total_inserted} words")
                        batch_data = []

                if batch_data:
                    stmt = insert(TranslationLexicon).values(batch_data)
                    stmt = stmt.on_conflict_do_nothing(
                        index_elements=['original_text', 'original_lang']
                    )
                    await session.execute(stmt)
                    await session.commit()
                    total_inserted += len(batch_data)
            
            logger.info(f"Seeding complete. Total: {total_inserted} words.")
            warm_up_redis_task.delay()

    run_async(_logic())