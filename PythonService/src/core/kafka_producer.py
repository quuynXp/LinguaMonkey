import logging
import asyncio
import json
import os
from aiokafka import AIOKafkaProducer

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
CHAT_PERSISTENCE_TOPIC = os.getenv("KAFKA_CHAT_TOPIC", "CHAT_MESSAGE_PERSISTENCE")

_producer = None

async def get_kafka_producer():
    """Khởi tạo và trả về singleton Kafka Producer."""
    global _producer
    if _producer is None:
        try:
            _producer = AIOKafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await _producer.start()
            logging.info("AIOKafkaProducer started.")
        except Exception as e:
            logging.error(f"Failed to start Kafka Producer: {e}")
            _producer = None
            raise
    return _producer

async def stop_kafka_producer():
    """Đóng producer khi shutdown app."""
    global _producer
    if _producer:
        await _producer.stop()
        _producer = None
        logging.info("AIOKafkaProducer stopped.")

async def send_chat_to_kafka(payload: dict):
    """
    Gửi payload chat (user + AI) đến Kafka topic để Java lưu trữ.
    """
    try:
        producer = await get_kafka_producer()
        await producer.send_and_wait(CHAT_PERSISTENCE_TOPIC, payload)
        logging.info(f"Sent chat persistence event for user: {payload.get('userId')}")
    except Exception as e:
        logging.error(f"Failed to send chat message to Kafka: {e}", exc_info=True)