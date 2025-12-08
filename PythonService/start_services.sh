#!/bin/bash
set -e

# In ra thư mục hiện tại để debug
echo "📂 Current Directory: $(pwd)"
echo "-----------------------------------"
echo "🚀 Starting Python Service..."
echo "-----------------------------------"

# 1. Start gRPC Server (Chạy ngầm - Background)
# SỬA Ở ĐÂY: Trỏ đúng vào file src/learning_service.py
if [ -f "src/learning_service.py" ]; then
    echo "✅ Found src/learning_service.py. Starting gRPC Server..."
    # Chạy module src.learning_service
    python -m src.learning_service &
    PID_GRPC=$!
    echo "Started gRPC process with PID: $PID_GRPC"
else
    echo "❌ ERROR: src/learning_service.py not found!"
    # Không thoát (exit) ngay để cho FastAPI vẫn chạy được, nhưng log warning to
fi

# 2. Start FastAPI Server (Chạy chính - Blocking)
# Port này do Render cấp (thường là 10000)
echo "🚀 Starting FastAPI Server on port $PORT..."

# Chạy module src.main
exec python -m src.main