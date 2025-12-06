#!/bin/sh

# Tạo thư mục config nếu chưa có
mkdir -p /app/config

# 1. Giải mã FIREBASE_CREDENTIALS_BASE64 ra file
if [ -n "$FIREBASE_CREDENTIALS_BASE64" ]; then
    echo "Found FIREBASE_CREDENTIALS_BASE64, decoding to file..."
    echo "$FIREBASE_CREDENTIALS_BASE64" | base64 -d > /app/config/service-account-key.json
    echo "Created /app/config/service-account-key.json"
else
    echo "WARNING: FIREBASE_CREDENTIALS_BASE64 is empty!"
fi

# 2. Giải mã GDRIVE_KEY_BASE64 ra file (nếu dùng Google Drive)
if [ -n "$GDRIVE_KEY_BASE64" ]; then
    echo "Found GDRIVE_KEY_BASE64, decoding to file..."
    echo "$GDRIVE_KEY_BASE64" | base64 -d > /app/config/gdrive-key.json
    echo "Created /app/config/gdrive-key.json"
fi

# 3. Chạy lệnh Java
exec "$@"