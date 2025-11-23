#!/bin/bash
set -e

# Sử dụng biến môi trường do Docker cung cấp
BACKUP_FILE="/docker-entrypoint-initdb.d/full_backup.dump"

echo "--- BẮT ĐẦU RESTORE DATABASE CUC BO (CLEAN RESTORE) ---"

# 1. Chờ PostgreSQL sẵn sàng (KHÔNG KẾT NỐI DB CỤ THỂ để tránh lỗi FATAL)
until pg_isready; do
    echo "🕐 Đang chờ PostgreSQL sẵn sàng..."
    sleep 2
done

# 2. CHẠY TOÀN BỘ RESTORE:
# -v: Verbose
# --clean --if-exists: Xóa và tạo lại sạch sẽ
# --no-owner --no-privileges: Khắc phục lỗi quyền role/user
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v --clean --if-exists --no-owner --no-privileges "$BACKUP_FILE"

echo "--- RESTORE DATABASE HOÀN TẤT ---"