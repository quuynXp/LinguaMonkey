FROM python:3.11-bookworm AS builder

WORKDIR /opt/venv
RUN python -m venv .
ENV PATH="/opt/venv/bin:$PATH"

# Cài đặt build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

COPY PythonService/requirements.txt .

# FIX MEMORY: Cài bản CPU cho torch để nhẹ nhất
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu || true

RUN pip install --no-cache-dir -r requirements.txt

# --- Final Stage ---
FROM python:3.11-slim-bookworm

# Cài đặt runtime libs và dos2unix (đề phòng cần debug file)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    procps \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy source code
COPY ./PythonService ./PythonService

# Generate gRPC code
RUN mkdir -p /app/PythonService/src/grpc_generated && \
    touch /app/PythonService/src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./PythonService/proto_files \
        --python_out=./PythonService/src/grpc_generated \
        --grpc_python_out=./PythonService/src/grpc_generated \
        ./PythonService/proto_files/*.proto

# Fix imports in generated files
RUN sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' /app/PythonService/src/grpc_generated/learning_service_pb2_grpc.py

# --- FIX EXEC FORMAT ERROR: TẠO FILE SCRIPT TRỰC TIẾP TRONG DOCKER ---
# Thay vì COPY file start_services.sh (dễ lỗi Windows), ta tạo mới nó tại đây.
# Script này kiểm tra file gRPC có tồn tại không trước khi chạy để tránh lỗi crash.
RUN printf '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting Python Service..."\n\
\n\
# Kiểm tra nếu file gRPC server tồn tại thì chạy, không thì bỏ qua\n\
if [ -f "PythonService/src/grpc_server.py" ] || [ -f "src/grpc_server.py" ]; then\n\
    echo "Found gRPC server file, starting..."\n\
    python -m src.grpc_server &\n\
else\n\
    echo "WARNING: gRPC server file not found. Skipping gRPC start."\n\
fi\n\
\n\
echo "Starting FastAPI Server on port $PORT..."\n\
# Chạy main.py (FastAPI)\n\
exec python PythonService/main.py\n\
' > /app/PythonService/start_services.sh

# Cấp quyền thực thi cho file vừa tạo
RUN chmod +x /app/PythonService/start_services.sh

EXPOSE 10000
EXPOSE 50051

ENV PORT=10000

# Chạy script
CMD ["/app/PythonService/start_services.sh"]