#!/bin/bash

set -e

echo "Starting Python Services..."

# FIX: Generate gRPC code VÀO TRONG src/grpc_generated
if [ ! -f "src/grpc_generated/learning_service_pb2.py" ]; then
    echo "Generating gRPC Python code..."
    mkdir -p src/grpc_generated
    touch src/grpc_generated/__init__.py
    
    # FIX: Output vào src/grpc_generated
    python -m grpc_tools.protoc \
        -I=./proto_files \
        --python_out=./src/grpc_generated \
        --grpc_python_out=./src/grpc_generated \
        ./proto_files/*.proto
    
    sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' \
        src/grpc_generated/learning_service_pb2_grpc.py
fi

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