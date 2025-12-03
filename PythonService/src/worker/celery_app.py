import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redisPass123")
REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:6379/0"

celery_app = Celery(
    'lingua_tasks',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['src.worker.tasks']
)

celery_app.conf.update(
    timezone='Asia/Ho_Chi_Minh',
    enable_utc=True,
    result_expires=3600,
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    broker_connection_retry_on_startup=True,
    worker_concurrency=4, # Giới hạn số lượng worker process
)

# --- ĐỊNH LỊCH TÁC VỤ (CRON JOBS) ---
celery_app.conf.beat_schedule = {
    # 1. Warm-up/Restore: Mỗi 30 phút, đẩy từ vựng HOT từ DB lên Redis (Backup ngược)
    'refresh-redis-cache-every-30m': {
        'task': 'src.worker.tasks.warm_up_redis_task',
        'schedule': crontab(minute='*/30'),
    },
    # 2. Cleanup: Mỗi 1 tiếng, xóa các key ít dùng khỏi Redis để tiết kiệm RAM
    'evict-unused-keys-every-1h': {
        'task': 'src.worker.tasks.evict_unused_redis_keys_task',
        'schedule': crontab(minute=0, hour='*/1'),
    },
    # 3. Augment: Khi rảnh (ví dụ ban đêm), quét DB tìm từ thiếu bản dịch và gọi API Free
    'populate-community-data-nightly': {
        'task': 'src.worker.tasks.populate_lexicon_from_community_task',
        'schedule': crontab(minute=0, hour=3), # 3 giờ sáng
    },
}