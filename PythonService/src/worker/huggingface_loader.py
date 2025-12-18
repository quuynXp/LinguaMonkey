import logging
import json
import asyncio
import re
from typing import List, Dict, Optional
from datasets import load_dataset
from redis.asyncio import Redis
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert 

from src.core.models import TranslationLexicon
from src.core.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATASET_SOURCES = [
    {
        "name": "facebook/flores",
        "configs": ["eng_Latn-vie_Latn", "eng_Latn-zho_Hans"],
        "splits": ["dev", "devtest"],
        "mapping": {
            "sentence_eng_Latn": "en", 
            "sentence_vie_Latn": "vi", 
            "sentence_zho_Hans": "zh-CN"
        }
    },
    {
        "name": "Helsinki-NLP/tatoeba_mt",
        "configs": ["eng-vie", "eng-zho"],
        "splits": ["test", "validation"],
        "mapping": {
            "eng": "en", 
            "vie": "vi", 
            "zho": "zh-CN",
            "sourceString": "src",
            "targetString": "tgt"
        }
    }
]

CHAT_KEYWORDS = [
    "hello", "hi", "hey", "bye", "goodbye", "hear", "see", "listen", "speak", 
    "camera", "video", "call", "mic", "microphone", "screen", "internet", 
    "connection", "slow", "lag", "online", "message", "chat", "link", "wait",
    "can you", "could you", "hear me", "see me", "help", "thanks", "sorry",
    "what", "where", "when", "why", "how", "okay", "ok", "sure", "yes", "no"
]

BATCH_SIZE = 2000
INGESTION_FLAG_KEY = "system:hf_ingestion_complete_v20" 

def is_garbage(text: str) -> bool:
    if not text or len(str(text)) < 2: return True
    text_str = str(text)
    if re.search(r'[~#^&*<>\[\]\\]', text_str): return True
    if text_str.isdigit(): return True
    return False

def normalize_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', str(text))
    return text.strip()

def get_redis_key(lang: str, text: str) -> str:
    normalized = re.sub(r'[^\w\s\u4e00-\u9fff]', '', text).lower().strip()
    return f"lex:{lang}:{normalized}"

def calculate_lexicon_priority(text: str) -> int:
    text_lower = text.lower()
    words = text_lower.split()
    word_count = len(words)
    
    score = 1000
    
    if word_count > 8:
        return 1 

    if word_count <= 3: score += 3000
    elif word_count <= 5: score += 1500
    
    if any(kw in text_lower for kw in CHAT_KEYWORDS):
        score += 5000
        
    return score

async def flush_batch_to_db(db, batch_dict: dict, pipeline):
    if not batch_dict:
        return
    
    await pipeline.execute()
    
    values = list(batch_dict.values())
    stmt = insert(TranslationLexicon).values(values)
    
    stmt = stmt.on_conflict_do_update(
        index_elements=['original_text', 'original_lang'],
        set_={
            "usage_count": func.greatest(TranslationLexicon.usage_count, stmt.excluded.usage_count),
            "translations": TranslationLexicon.translations.concat(stmt.excluded.translations),
            "last_used_at": func.now()
        }
    )
    
    await db.execute(stmt)
    await db.commit()
    batch_dict.clear()

async def ingest_huggingface_data(redis: Redis):
    async with AsyncSessionLocal() as db:
        try:
            pipeline = redis.pipeline()
            total_processed = 0

            for source in DATASET_SOURCES:
                for config in source["configs"]:
                    for split in source["splits"]:
                        logger.info(f"📥 Loading: {source['name']} | {config} | {split}")
                        
                        try:
                            dataset = await asyncio.to_thread(
                                load_dataset, source['name'], config, split=split
                            )
                        except Exception as e:
                            logger.warning(f"⚠️ Skip {config}: {e}")
                            continue

                        batch_dict = {}
                        count = 0
                        
                        for row in dataset:
                            pairs = []
                            
                            if "translation" in row and isinstance(row["translation"], dict):
                                trans = row["translation"]
                                keys = list(trans.keys())
                                if len(keys) >= 2:
                                    s_k, t_k = keys[0], keys[1]
                                    pairs.append((
                                        source["mapping"].get(s_k, s_k), trans[s_k],
                                        source["mapping"].get(t_k, t_k), trans[t_k]
                                    ))
                            
                            elif "sourceString" in row and "targetString" in row:
                                s_text = row.get("sourceString")
                                t_text = row.get("targetString")
                                s_lang_raw = row.get("sourceLang", config.split('-')[0])
                                t_lang_raw = row.get("targetlang", config.split('-')[1])
                                s_lang = source["mapping"].get(s_lang_raw, s_lang_raw)
                                t_lang = source["mapping"].get(t_lang_raw, t_lang_raw)
                                pairs.append((s_lang, s_text, t_lang, t_text))
                            
                            elif "facebook/flores" in source["name"]:
                                eng_text = row.get("sentence_eng_Latn")
                                if "vie" in config:
                                    pairs.append(("en", eng_text, "vi", row.get("sentence_vie_Latn")))
                                elif "zho" in config:
                                    pairs.append(("en", eng_text, "zh-CN", row.get("sentence_zho_Hans")))

                            for s_lang, s_text, t_lang, t_text in pairs:
                                if not s_text or not t_text or is_garbage(s_text) or is_garbage(t_text):
                                    continue

                                s_text, t_text = normalize_text(s_text), normalize_text(t_text)
                                priority_score = calculate_lexicon_priority(s_text)
                                
                                pipeline.hset(get_redis_key(s_lang, s_text), mapping={t_lang: t_text})
                                
                                if priority_score > 100:
                                    pipeline.hset(get_redis_key(t_lang, t_text), mapping={s_lang: s_text})
                                
                                batch_key = (s_text, s_lang)

                                if batch_key in batch_dict:
                                    batch_dict[batch_key]["translations"].update({t_lang: t_text})
                                    current_score = batch_dict[batch_key]["usage_count"]
                                    batch_dict[batch_key]["usage_count"] = max(current_score, priority_score)
                                else:
                                    batch_dict[batch_key] = {
                                        "original_text": s_text,
                                        "original_lang": s_lang,
                                        "translations": {t_lang: t_text},
                                        "usage_count": priority_score
                                    }
                                
                                count += 1

                                if len(batch_dict) >= BATCH_SIZE:
                                    await flush_batch_to_db(db, batch_dict, pipeline)

                        await flush_batch_to_db(db, batch_dict, pipeline)
                        total_processed += count
                        logger.info(f"✅ Sub-total for {config}-{split}: {count} pairs.")

            await redis.set(INGESTION_FLAG_KEY, "1")
            logger.info(f"🚀 Lexicon Ingestion Finished. Total valid phrases: {total_processed}")
        
        except Exception as e:
            logger.error(f"❌ Ingestion failed: {e}", exc_info=True)
            await db.rollback()
            raise e