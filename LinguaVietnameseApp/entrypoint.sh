#!/bin/bash
set -e

# Tạo thư mục config nếu chưa có
mkdir -p /app/config

# --- LOGIC XỬ LÝ GOOGLE CREDENTIALS ---
# Chỉ decode từ Base64 nếu file CHƯA TỒN TẠI (tránh ghi đè file mount từ volume ở local)

if [ ! -f "/app/config/service-account-key.json" ]; then
    if [ -n "$FIREBASE_CREDENTIALS_BASE64" ]; then
        echo "Found FIREBASE_CREDENTIALS_BASE64, decoding to file..."
        # Sử dụng tr -d để loại bỏ ký tự xuống dòng (nguyên nhân gây lỗi base64: invalid input)
        echo "$FIREBASE_CREDENTIALS_BASE64" | tr -d '\n\r' | base64 -d > /app/config/service-account-key.json
        echo "Created /app/config/service-account-key.json"
    else
        echo "WARNING: No FIREBASE_CREDENTIALS_BASE64 found and file does not exist."
    fi
else
    echo "File /app/config/service-account-key.json exists (likely mounted). Skipping Base64 decode."
fi

if [ ! -f "/app/config/gdrive-key.json" ]; then
    if [ -n "$GDRIVE_KEY_BASE64" ]; then
        echo "Found GDRIVE_KEY_BASE64, decoding to file..."
        echo "$GDRIVE_KEY_BASE64" | tr -d '\n\r' | base64 -d > /app/config/gdrive-key.json
        echo "Created /app/config/gdrive-key.json"
    else
        echo "WARNING: No GDRIVE_KEY_BASE64 found and file does not exist."
    fi
else
    echo "File /app/config/gdrive-key.json exists (likely mounted). Skipping Base64 decode."
fi

# --- KHỞI CHẠY APP ---
# Nhận các tham số truyền vào từ Docker (CMD)
exec "$@"