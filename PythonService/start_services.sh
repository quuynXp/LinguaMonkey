#!/bin/sh
set -e

# Đặt biến môi trường GRPC_PORT
GRPC_PORT=${GRPC_PORT:-50051}
echo "Starting Python Services..."

# --- 1. START GRPC SERVER (learning_service.py) ---
# Chạy learning_service.py như một script (chú ý đường dẫn tương đối ./learning_service.py)
# HOẶC chạy module: python src/learning_service.py
echo "Starting gRPC Server on port $GRPC_PORT..."
python -m src.learning_service 2>&1 &

# --- 2. START FASTAPI REST SERVER (main.py) ---
# Chạy FastAPI bằng Uvicorn module
# Lệnh này sẽ chạy FastAPI trên port 8001 và là tiến trình chính
echo "Starting FastAPI REST Server on port 8001..."
# LƯU Ý: Lệnh uvicorn này đã được thay thế trong Dockerfile cũ của bạn, nhưng tôi dùng nó để đảm bảo port 8001.
# Do đó, ta sẽ chạy nó ở nền và dùng tail -f để giữ container sống
uvicorn src.main:app --host 0.0.0.0 --port 8001 2>&1 &

# --- 3. GIỮ CONTAINER SỐNG VÀ GIÁM SÁT ---
echo "Monitoring services..."
sleep 5
# Giữ container sống (Nếu muốn giữ container sống ngay cả khi một service dừng, 
# ta sẽ dùng một vòng lặp kiểm tra hoặc supervisord, nhưng tail -f là cách nhanh nhất.)
tail -f /dev/null