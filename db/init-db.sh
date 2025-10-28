#!/bin/bash
set -e

echo "Bắt đầu restore database từ backup..."

# Chạy pg_restore để nạp dữ liệu từ file backup vào DB đã được tạo
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v "/docker-entrypoint-initdb.d/backupFull.backup"

echo "Restore database hoàn tất."
