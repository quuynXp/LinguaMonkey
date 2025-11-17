# src/core/kafka_consumer.py
import logging
import asyncio
import json
import os
from aiokafka import AIOKafkaConsumer
from .cache import get_redis_client, delete_from_cache

KAFKA_TOPIC = os.getenv("KAFKA_USER_PROFILE_TOPIC", "USER_PROFILE_UPDATES")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_CONSUMER_GROUP = os.getenv("KAFKA_CONSUMER_GROUP_ID", "python-profile-consumer")

CACHE_KEY_PREFIX = "user_profile"  # Phải khớp với user_profile_service


async def consume_user_updates():
    """
    Lắng nghe topic Kafka để vô hiệu hóa cache Redis khi Java/service khác
    cập nhật dữ liệu người dùng.
    """
    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_CONSUMER_GROUP,
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )

    await consumer.start()
    logging.info(f"Kafka consumer started. Subscribed to topic: {KAFKA_TOPIC}")

    redis_client = get_redis_client()

    try:
        async for msg in consumer:
            try:
                message_data = msg.value
                user_id = message_data.get("user_id")

                if not user_id:
                    logging.warning(
                        f"Received invalid message (missing 'user_id'): {message_data}"
                    )
                    continue

                # Đây là bước quan trọng: Xóa cache
                cache_key = f"{CACHE_KEY_PREFIX}:{user_id}"
                await delete_from_cache(redis_client, cache_key)

                logging.info(
                    f"Cache invalidated for user_id: {user_id} due to Kafka event."
                )

            except json.JSONDecodeError:
                logging.error(f"Failed to decode Kafka message: {msg.value}")
            except Exception as e:
                logging.error(f"Error processing Kafka message: {e}", exc_info=True)

    finally:
        logging.info("Stopping Kafka consumer...")
        await consumer.stop()
