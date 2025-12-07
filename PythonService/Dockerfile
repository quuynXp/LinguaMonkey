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

RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu || true

RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    procps \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/PythonService

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY ./PythonService .

RUN mkdir -p src/grpc_generated && \
    touch src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./proto_files \
        --python_out=./src/grpc_generated \
        --grpc_python_out=./src/grpc_generated \
        ./proto_files/*.proto

RUN sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' src/grpc_generated/learning_service_pb2_grpc.py

RUN printf '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting Python Service..."\n\
\n\
if [ -f "src/grpc_server.py" ]; then\n\
    echo "Found gRPC server file, starting..."\n\
    python -m src.grpc_server &\n\
else\n\
    echo "WARNING: gRPC server file not found. Skipping gRPC start."\n\
fi\n\
\n\
echo "Starting FastAPI Server on port $PORT..."\n\
exec python -m src.main\n\
' > start_services.sh

RUN chmod +x start_services.sh

EXPOSE 10000
EXPOSE 50051

ENV PORT=10000

CMD ["./start_services.sh"]