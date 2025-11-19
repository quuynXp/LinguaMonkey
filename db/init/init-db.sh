#!/bin/bash
set -e

BACKUP_FILE="/docker-entrypoint-initdb.d/full_backup.dump"

echo "--- BẮT ĐẦU QUÁ TRÌNH RESTORE TỪ FILE DUMP ---"

# 1. Chờ PostgreSQL khởi động hoàn tất
until pg_isready -U "$POSTGRES_USER"; do
  echo "🕐 Đang chờ PostgreSQL sẵn sàng..."
  sleep 2
done

# 2. Kiểm tra xem file dump có tồn tại không
if [ -f "$BACKUP_FILE" ]; then
  echo "✅ Đã tìm thấy file backup: $BACKUP_FILE"
  echo "🚀 Đang thực hiện pg_restore..."

  # 3. Lệnh Restore chuẩn cho file .dump (Custom Format)
  # -v: Verbose (hiện chi tiết)
  # --clean --if-exists: Xóa dữ liệu cũ (DROP) trước khi tạo mới (CREATE) để đảm bảo sạch sẽ.
  # --no-owner: QUAN TRỌNG - Bỏ qua việc gán chủ sở hữu (tránh lỗi 'role linguauser does not exist').
  # --no-privileges: Bỏ qua việc gán quyền hạn (tránh lỗi permission thừa).
  
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v --clean --if-exists --no-owner --no-privileges "$BACKUP_FILE" || {
      echo "❌ Có lỗi xảy ra nhưng có thể bỏ qua nếu là warning (xem log trên)."
  }

  echo "🎉 --- RESTORE DATABASE HOÀN TẤT ---"
else
  echo "⚠️ CẢNH BÁO: Không tìm thấy file $BACKUP_FILE trong thư mục /docker-entrypoint-initdb.d/"
  echo "Hãy chắc chắn bạn đã copy file .dump vào thư mục ./db trên máy host và đổi tên đúng."
fi