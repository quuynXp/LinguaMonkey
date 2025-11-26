#!/bin/sh
set -e

# Đặt PYTHONPATH để Python có thể tìm thấy thư mục 'src' trong 'PythonService'
# LỆNH NÀY CỰC KỲ QUAN TRỌNG ĐỂ KHẮC PHỤC LỖI IMPORT
export PYTHONPATH="$PYTHONPATH:./PythonService"

GRPC_PORT=${GRPC_PORT:-50051}
echo "Starting Python Services..."

# --- 1. START GRPC SERVER (learning_service.py) ---
# Chạy learning_service.py như một module. PYTHONPATH đã được thiết lập.
echo "Starting gRPC Server on port $GRPC_PORT..."
python -m src.learning_service 2>&1 &

# --- 2. START FASTAPI REST SERVER (main.py) ---
# Chạy FastAPI bằng Uvicorn module. PYTHONPATH đã được thiết lập.
echo "Starting FastAPI REST Server on port 8001..."
# Chú ý: Dùng & để chạy nền
uvicorn src.main:app --host 0.0.0.0 --port 8001 2>&1 &

# --- 3. GIỮ CONTAINER SỐNG VÀ GIÁM SÁT ---
echo "Monitoring services..."
sleep 5
tail -f /dev/null