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

RUN pip uninstall -y proto || true

RUN pip install --no-cache-dir --force-reinstall \
    proto-plus==1.25.0 \
    protobuf==4.25.3 \
    google-api-core==2.17.1 \
    google-generativeai==0.7.2 \
    googleapis-common-protos==1.63.0 \
    grpcio==1.62.2 \
    grpcio-tools==1.62.2

RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.6.0 \
    torchvision==0.21.0 \
    torchaudio==2.6.0

COPY PythonService/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN set -eux; \
    for p in /opt/venv/lib/python3.11/site-packages/proto* /opt/venv/lib/python3.11/site-packages/proto.py; do \
      if [ -e "$p" ]; then rm -rf "$p"; fi; \
    done; \
    pip uninstall -y proto || true

RUN pip install --no-cache-dir --force-reinstall \
    proto-plus==1.25.0 \
    protobuf==4.25.3 \
    google-generativeai==0.7.2

FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY . .

ENV PATH="/opt/venv/bin:$PATH"

RUN mkdir -p /app/src/grpc_generated && \
    touch /app/src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./proto_files \
        --python_out=./src \
        --grpc_python_out=./src \
        ./proto_files/*.proto

RUN sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' /app/src/learning_service_pb2_grpc.py

RUN chmod +x start_services.sh

EXPOSE 8001
EXPOSE 50051

CMD ["./start_services.sh"]