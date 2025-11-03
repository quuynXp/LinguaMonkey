#!/bin/bash

# --- CẤU HÌNH ---
# Tên container CSDL (từ docker-compose.yml)
CONTAINER_NAME="app-database" 

# Thông tin CSDL (từ docker-compose.yml)
DB_USER="linguauser"
DB_NAME="linguaviet_db"
DB_PASS="linguapass"

# Đường dẫn đến file backup trên máy HOST của bạn
BACKUP_FILE="db/backupFinal.backup"

# --- KẾT THÚC CẤU HÌNH ---

echo "--- Bắt đầu script khôi phục CSDL ---"

# 1. Kiểm tra xem container CSDL đã chạy chưa
if [ ! "$(docker ps -q -f name=^/${CONTAINER_NAME}$)" ]; then
    echo "❌ LỖI: Container CSDL '$CONTAINER_NAME' dường như chưa chạy."
    echo "Vui lòng chạy 'docker-compose up -d' trước khi thực thi script này."
    exit 1
fi

echo "✅ Container '$CONTAINER_NAME' đang chạy."

# 2. Kiểm tra file backup
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ LỖI: Không tìm thấy file backup tại '$BACKUP_FILE'!"
    echo "Hãy chắc chắn rằng bạn đang chạy script này từ thư mục gốc của dự án."
    exit 1
fi

echo "✅ Đã tìm thấy file backup: '$BACKUP_FILE'."

# 3. Đặt biến môi trường PGPASSWORD để 'psql' và 'pg_restore' tự động dùng
# Đây là cách an toàn hơn là gõ mật khẩu vào dòng lệnh
export PGPASSWORD=$DB_PASS

# 4. Dọn dẹp schema 'public' (Giống hệt GHA)
# Chúng ta thực thi lệnh 'psql' BÊN TRONG container
echo "🧹 Đang dọn dẹp schema 'public' (DROP/CREATE)..."
docker exec -e PGPASSWORD=$PGPASSWORD $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE;"
docker exec -e PGPASSWORD=$PGPASSWORD $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "CREATE SCHEMA public;"
echo "✅ Schema 'public' đã được tạo lại."

# 5. Khôi phục CSDL (Giống hệt GHA)
# Chúng ta dùng 'cat' để đọc file backup từ HOST
# và PIPE (dấu |) nó vào lệnh 'docker exec -i' để 'pg_restore' BÊN TRONG container đọc
echo "🚀 Đang khôi phục CSDL từ '$BACKUP_FILE'..."
cat $BACKUP_FILE | docker exec -i -e PGPASSWORD=$PGPASSWORD $CONTAINER_NAME pg_restore \
    --verbose \
    --clean \
    --no-acl \
    --no-owner \
    --dbname=$DB_NAME \
    -U $DB_USER

echo "🎉 --- HOÀN TẤT ---"
echo "✅ CSDL '$DB_NAME' đã được khôi phục thành công!"

# Hủy biến môi trường PGPASSWORD
unset PGPASSWORD
