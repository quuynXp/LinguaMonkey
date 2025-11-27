FROM python:3.11-bookworm AS builder

# 1. SETUP VENV & BUILD ESSENTIALS
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

# 2. DEPENDENCY CACHING: Tải thư viện chỉ khi requirements.txt thay đổi
# COPY file requirements.txt trước tiên để tạo cache layer cho bước cài đặt
# *LƯU Ý:* Bạn phải đảm bảo tất cả các thư viện (bao gồm proto, grpc, và torch)
# đã được thêm vào file `PythonService/requirements.txt` để bước này hoạt động.
COPY PythonService/requirements.txt .

# Cài đặt tất cả dependencies từ requirements.txt.
# Nếu requirements.txt không thay đổi, bước này sẽ dùng cache.
RUN pip install --no-cache-dir -r requirements.txt \
    --index-url https://download.pytorch.org/whl/cpu || \
    pip install --no-cache-dir -r requirements.txt # Thử lại không có index-url nếu thất bại

# *Gỡ bỏ các lệnh RUN cài đặt thư viện riêng lẻ trước đó*

# 3. BUILD ARTIFACTS
FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# COPY venv đã được build và cache từ stage builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# COPY toàn bộ code còn lại. Bước này sẽ làm mất cache nếu code thay đổi,
# nhưng bước cài đặt thư viện (nặng) đã được cache.
COPY . .

# --- THAY ĐỔI ĐƯỜNG DẪN GRPC TẠI ĐÂY ---
# WORKDIR là /app, code nằm ở /app/PythonService/
RUN mkdir -p /app/PythonService/src/grpc_generated && \
    touch /app/PythonService/src/grpc_generated/__init__.py && \
    python -m grpc_tools.protoc \
        -I=./PythonService/proto_files \
        --python_out=./PythonService/src/grpc_generated \
        --grpc_python_out=./PythonService/src/grpc_generated \
        ./PythonService/proto_files/*.proto

# FIX import path: /app/PythonService/src/grpc_generated/learning_service_pb2_grpc.py
# Cần điều chỉnh lại path import dựa trên thư mục mới là grpc_generated
RUN sed -i 's/^import learning_service_pb2/from . import learning_service_pb2/' /app/PythonService/src/grpc_generated/learning_service_pb2_grpc.py

# FIX start_services.sh path: /app/PythonService/start_services.sh
RUN chmod +x PythonService/start_services.sh

RUN sed -i 's/\r$//' PythonService/start_services.sh

EXPOSE 8001
EXPOSE 50051

# FIX CMD path: /app/PythonService/start_services.sh
CMD ["./PythonService/start_services.sh"]