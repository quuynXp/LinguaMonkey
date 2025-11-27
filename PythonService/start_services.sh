#!/bin/sh
set -e
export PYTHONPATH="$PYTHONPATH:./PythonService"

GRPC_PORT=${GRPC_PORT:-50051} 
FASTAPI_PORT=${PORT:-8001} 

echo "Starting gRPC Server on port $GRPC_PORT..."
python -m src.learning_service 2>&1 &

echo "Starting FastAPI REST Server on port $FASTAPI_PORT..."
uvicorn src.main:app --host 0.0.0.0 --port $FASTAPI_PORT 2>&1 &

echo "Monitoring services..."
sleep 5
tail -f /dev/null