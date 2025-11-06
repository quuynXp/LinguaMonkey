#!/bin/bash
set -e

echo "--- BAT DAU RESTORE DATABASE CUC BO (CLEAN RESTORE) ---"

# 1. Chờ PostgreSQL sẵn sàng
until pg_isready -U "$POSTGRES_USER"; do
  echo "🕐 Đang chờ PostgreSQL sẵn sàng..."
  sleep 2
done

# 2. CHẠY TOÀN BỘ RESTORE:
# --clean: Yêu cầu xóa các đối tượng trước khi tạo.
# --if-exists: Giúp lệnh DROP (từ --clean) không lỗi nếu đối tượng chưa tồn tại.
# --no-owner: Bỏ qua việc thiết lập lại quyền sở hữu (tránh lỗi user).
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v --clean --if-exists --no-owner "/docker-entrypoint-initdb.d/full_backup.backup"

echo "--- RESTORE DATABASE HOÀN TẤT ---"