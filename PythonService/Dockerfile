# ==========================================
# STAGE 1: BUILDER
# ==========================================
FROM python:3.11-bookworm AS builder

WORKDIR /opt/venv
RUN python -m venv .
ENV PATH="/opt/venv/bin:$PATH"

# Cài đặt dependency để build các wheels cần thiết
# Đã loại bỏ các thư viện build quá nặng nếu không dùng Torch
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1-dev \
    libffi-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

COPY PythonService/requirements.txt .

# --- QUAN TRỌNG: Đã xoá dòng cài đặt torch/torchvision/torchaudio ---
# Nếu requirements.txt vẫn còn dòng 'torch', hãy xoá hoặc comment lại trong file đó,
# hoặc dùng lệnh sed này để loại bỏ nó trước khi install:
RUN sed -i '/torch/d' requirements.txt && \
    sed -i '/torchaudio/d' requirements.txt && \
    sed -i '/torchvision/d' requirements.txt && \
    sed -i '/transformers/d' requirements.txt

# Cài đặt các thư viện còn lại (Azure, gRPC, etc.)
RUN pip install --no-cache-dir -r requirements.txt

# ==========================================
# STAGE 2: FINAL RUNTIME
# ==========================================
FROM python:3.11-slim-bookworm

# Cài đặt thư viện hệ thống RUNTIME
# 1. libasound2: BẮT BUỘC cho Azure Speech SDK (Audio backend)
# 2. ca-certificates: BẮT BUỘC để Azure connect HTTPS
# 3. libsndfile1: Để xử lý file âm thanh
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libasound2 \
    libssl-dev \
    ca-certificates \
    procps \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Update chứng chỉ SSL
RUN update-ca-certificates

WORKDIR /app/PythonService

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY ./PythonService .

# Sinh code gRPC
RUN mkdir -p src/grpc_generated && \
    touch src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./proto_files \
        --python_out=./src/grpc_generated \
        --grpc_python_out=./src/grpc_generated \
        ./proto_files/*.proto

# Fix import relative
RUN sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' src/grpc_generated/learning_service_pb2_grpc.py

# Script khởi chạy
RUN printf '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting Python Service..."\n\
\n\
if [ -f "src/learning_service.py" ]; then\n\
    echo "✅ Found gRPC server file, starting..."\n\
    python -m src.learning_service &\n\
else\n\
    echo "⚠️ WARNING: src/learning_service.py not found. Skipping gRPC start."\n\
fi\n\
\n\
echo "Starting FastAPI Server on port $PORT..."\n\
exec python -m src.main\n\
' > start_services.sh

RUN chmod +x start_services.sh

# Environment variables
ENV MALLOC_ARENA_MAX=2
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

EXPOSE 10000
EXPOSE 50051

CMD ["./start_services.sh"]