# ----- GIAI ĐOẠN 1: "BUILDER" -----
# Sửa lỗi: Dùng bản "bookworm" đầy đủ làm builder, không dùng "slim"
FROM python:3.11-bookworm as builder

# Cài đặt các gói hệ thống cần thiết để "build"
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Tạo một môi trường ảo (virtual environment)
WORKDIR /opt/venv
RUN python -m venv .
ENV PATH="/opt/venv/bin:$PATH"

# --- THAY ĐỔI QUAN TRỌNG BẮT ĐẦU TỪ ĐÂY ---

# 1. Cài đặt PyTorch (và các thư viện con) phiên bản CPU-ONLY.
# Chúng ta dùng một index-url đặc biệt của PyTorch.
#
# LƯU Ý: Phiên bản "2.9.0" của bạn có vẻ là lỗi gõ (typing error),
# phiên bản ổn định (stable) gần đây là "2.3.1".
# Tôi sẽ dùng 2.3.1 làm ví dụ.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.1 \
    torchvision==0.18.1 \
    torchaudio==2.3.1

# 2. Copy và cài đặt PHẦN CÒN LẠI của requirements
# (Hãy chắc chắn bạn đã XÓA 'torch' khỏi requirements.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- KẾT THÚC THAY ĐỔI ---


# ----- GIAI ĐOẠN 2: "FINAL" -----
# Giai đoạn này giữ nguyên, dùng "slim-bookworm" là chính xác
FROM python:3.11-slim-bookworm

# Cài đặt CHỈ các thư viện chia sẻ (.so) cần thiết lúc RUNTIME
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libjpeg62-turbo \
    libfreetype6 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy môi trường ảo (đã được tối ưu CPU) từ builder
COPY --from=builder /opt/venv /opt/venv

# Copy mã nguồn ứng dụng
COPY . .

# Kích hoạt môi trường ảo
ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]

