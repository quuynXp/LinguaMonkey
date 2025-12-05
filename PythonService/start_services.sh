#!/bin/sh
set -e
export PYTHONPATH="$PYTHONPATH:./PythonService"

GRPC_PORT=${GRPC_PORT:-50051} 
FASTAPI_PORT=${PORT:-10000} 

echo "Starting gRPC Server on port $GRPC_PORT (Background)..."
# Chạy gRPC dưới background
python -m src.learning_service > /dev/null 2>&1 &

echo "Starting FastAPI REST Server on port $FASTAPI_PORT (Foreground)..."
# Chạy Uvicorn ở FOREGROUND để Render bắt được tín hiệu port
# Thêm --workers 1 để giới hạn RAM
uvicorn src.main:app --host 0.0.0.0 --port $FASTAPI_PORT --workers 1 --no-access-log