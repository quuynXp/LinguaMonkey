# ----- BUILDER (fix proto triệt để) -----
# (Giữ nguyên toàn bộ stage 1 y hệt như file của bạn)
FROM python:3.11-bookworm AS builder

WORKDIR /opt/venv
RUN python -m venv .
ENV PATH="/opt/venv/bin:$PATH"

# Cài đặt hệ thống
RUN apt-get update && apt-get install -y \
    build-essential libsndfile1-dev libjpeg-dev zlib1g-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Gỡ 'proto' nếu có
RUN pip uninstall -y proto || true

# Cài các thư viện Google/gRPC (quan trọng là có grpcio-tools)
RUN pip install --no-cache-dir --force-reinstall \
    proto-plus==1.25.0 \
    protobuf==4.25.3 \
    google-api-core==2.17.1 \
    google-generativeai==0.7.2 \
    googleapis-common-protos==1.63.0 \
    grpcio==1.62.2 \
    grpcio-tools==1.62.2

# Cài PyTorch (nếu cần)
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.1 torchvision==0.18.1 torchaudio==2.3.1

# Copy và cài requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Dọn dẹp 'proto' lần cuối
RUN set -eux; \
    for p in /opt/venv/lib/python3.11/site-packages/proto* /opt/venv/lib/python3.11/site-packages/proto.py; do \
      if [ -e "$p" ]; then rm -rf "$p"; fi; \
    done; \
    pip uninstall -y proto || true

# Force-reinstall các thư viện Google
RUN pip install --no-cache-dir --force-reinstall \
    proto-plus==1.25.0 \
    protobuf==4.25.3 \
    google-generativeai==0.7.2


# ----- GIAI ĐOẠN 2: "FINAL" -----
FROM python:3.11-slim-bookworm

# Cài đặt runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual env từ 'builder'
COPY --from=builder /opt/venv /opt/venv

# Copy TẤT CẢ source code (bao gồm /src và /proto_files)
COPY . .

# Kích hoạt virtual env
ENV PATH="/opt/venv/bin:$PATH"

# -----------------------------------------------------------------
# SỬA ĐỔI CHÍNH Ở ĐÂY: TỰ ĐỘNG BIÊN DỊCH GRPC
# -----------------------------------------------------------------
# Giả định: 
# 1. Thư mục file .proto là: /app/proto_files
# 2. Bạn muốn code Python tạo ra nằm ở: /app/src/grpc_generated
#    (Để code trong /app/src/api có thể import: from src.grpc_generated import ...)
RUN mkdir -p /app/src/grpc_generated && \
    touch /app/src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./proto_files \
        --python_out=./src \
        --grpc_python_out=./src \
        ./proto_files/*.proto

# -----------------------------------------------------------------

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]