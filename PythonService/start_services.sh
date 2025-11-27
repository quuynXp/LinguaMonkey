# Sửa lại start_service.sh để dùng biến môi trường PORT (từ Render) và GRPC_PORT mới
#!/bin/sh
set -e
export PYTHONPATH="$PYTHONPATH:./PythonService"

# GRPC_PORT sẽ nhận 50051 từ Render (hoặc 50051 nếu chạy compose local)
GRPC_PORT=${GRPC_PORT:-50051} 
# Uvicorn sẽ dùng biến môi trường PORT do Render cung cấp (8001)
FASTAPI_PORT=${PORT:-8001} 

echo "Starting gRPC Server on port $GRPC_PORT..."
python -m src.learning_service 2>&1 &

echo "Starting FastAPI REST Server on port $FASTAPI_PORT..."
uvicorn src.main:app --host 0.0.0.0 --port $FASTAPI_PORT 2>&1 &

echo "Monitoring services..."
sleep 5
tail -f /dev/null