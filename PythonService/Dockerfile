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

COPY PythonService/requirements.txt .

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

# Copy only the PythonService folder to maintain structure /app/PythonService
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
RUN chmod +x PythonService/start_services.sh && \
    sed -i 's/\r$//' PythonService/start_services.sh

EXPOSE 8001
EXPOSE 50051

# Command matches the folder structure
CMD ["./PythonService/start_services.sh"]