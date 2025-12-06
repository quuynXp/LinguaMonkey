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

# FIX MEMORY: Bắt buộc cài bản CPU cho torch/torchvision/torchaudio để nhẹ nhất có thể
# Nếu requirements.txt của bạn không chỉ định version, dòng này sẽ giúp tránh cài bản GPU nặng nề
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu || true

# Cài các thư viện còn lại
RUN pip install --no-cache-dir -r requirements.txt

# --- Final Stage ---
FROM python:3.11-slim-bookworm

# Cài đặt runtime libs cần thiết (nhẹ hơn dev tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    procps \
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

# Setup startup script
COPY PythonService/start_services.sh ./PythonService/start_services.sh
RUN chmod +x PythonService/start_services.sh && \
    sed -i 's/\r$//' PythonService/start_services.sh

# Expose ports
EXPOSE 10000
EXPOSE 50051

# Set Default Port env nếu chưa có
ENV PORT=10000

# Command to run
CMD ["./PythonService/start_services.sh"]