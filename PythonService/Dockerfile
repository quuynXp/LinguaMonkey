FROM python:3.11-bookworm AS builder

WORKDIR /opt/venv
RUN python -m venv .
ENV PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

# FIX: Copy từ ./PythonService (vì context là root .)
COPY ./PythonService/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
    --index-url https://download.pytorch.org/whl/cpu || \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app/PythonService"

# FIX: Copy toàn bộ PythonService vào /app/PythonService
COPY ./PythonService ./PythonService

# FIX: Copy public key từ root context
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/src/main/resources/public_key.pem ./public_key.pem

# Generate gRPC code
RUN mkdir -p /app/PythonService/src/grpc_generated && \
    touch /app/PythonService/src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./PythonService/proto_files \
        --python_out=./PythonService/src/grpc_generated \
        --grpc_python_out=./PythonService/src/grpc_generated \
        ./PythonService/proto_files/*.proto

# Fix import path
RUN sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' \
    /app/PythonService/src/grpc_generated/learning_service_pb2_grpc.py

RUN chmod +x /app/PythonService/start_services.sh

EXPOSE 8001 50051

WORKDIR /app/PythonService
CMD ["./start_services.sh"]