#!/bin/bash

# Thiết lập để dừng script ngay khi có lỗi
set -e

echo "Starting Python Services..."

# ==============================================================================
# 1. SINH VÀ CẬP NHẬT CODE GRPC (CHẠY MỖI KHI KHỞI ĐỘNG CONTAINER)
# Chạy vô điều kiện để đảm bảo cập nhật khi file .proto thay đổi trên Host
# ==============================================================================
echo "Generating gRPC Python code..."

mkdir -p src/grpc_generated
touch src/grpc_generated/__init__.py

# Chạy lệnh sinh code
python -m grpc_tools.protoc \
    -I=./proto_files \
    --python_out=./src/grpc_generated \
    --grpc_python_out=./src/grpc_generated \
    ./proto_files/*.proto

# FIX: Điều chỉnh import tương đối
sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' \
    src/grpc_generated/learning_service_pb2_grpc.py

echo "Generation complete."
echo "----------------------------------------------------"

# ==============================================================================
# 2. KHỞI CHẠY CÁC DỊCH VỤ PYTHON
# ==============================================================================
echo "Starting gRPC Server on port 50051..."
python -m src.learning_service &
GRPC_PID=$!

echo "Starting FastAPI REST Server on port 8001..."
python -m src.main &
REST_PID=$!

echo "Monitoring services..."
wait -n $GRPC_PID $REST_PID

kill $GRPC_PID $REST_PID 2>/dev/null
exit 1