# src/core/cache.py
import aioredis
import logging
import os
import json

redis_client = None


def get_redis_client():
    global redis_client
    if redis_client is None:
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            redis_client = aioredis.from_url(redis_url, decode_responses=True)
            logging.info(f"Redis client initialized at {redis_url}")
        except Exception as e:
            logging.error(f"Failed to initialize Redis: {e}")
            raise
    return redis_client


async def close_redis_client():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
        logging.info("Redis client closed.")


async def get_from_cache(client: aioredis.Redis, key: str):
    try:
        cached_data = await client.get(key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        logging.warning(f"Cache GET error for key {key}: {e}")
    return None


async def set_to_cache(
    client: aioredis.Redis, key: str, data: dict, ttl_seconds: int = 3600
):
    try:
        await client.set(key, json.dumps(data), ex=ttl_seconds)
    except Exception as e:
        logging.warning(f"Cache SET error for key {key}: {e}")
