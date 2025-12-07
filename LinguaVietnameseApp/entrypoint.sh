#!/bin/bash
set -e

# Đảm bảo quyền thực thi (phòng hờ)
# Lưu ý: Trên Render, thư mục /etc/secrets là Read-Only, không thể chmod hay ghi đè vào đó.
# Chúng ta chỉ cần chạy app Java.

echo "Starting LinguaVietnameseApp..."
echo "Using Credential Path: $GOOGLE_CREDENTIALS_FILE_URL"

# Chạy lệnh được truyền vào từ Dockerfile (thường là java -jar ...)
exec "$@"