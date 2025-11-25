#!/bin/bash
# restore_db_render.sh
# Usage: ./restore_db_render.sh <path_to_backup_file.sql> <render_external_connection_string>

BACKUP_FILE=$1
CONN_STRING=$2

# Check arguments
if [ -z "$BACKUP_FILE" ] || [ -z "$CONN_STRING" ]; then
    echo "❌ Error: Missing arguments."
    echo "Usage: ./restore_db_render.sh <path_to_backup_file.sql> <render_connection_string>"
    echo "Example: ./restore_db_render.sh ./backups/backup.sql postgres://user:pass@host/db"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🚀 Starting database restore to Render..."
echo "📂 Backup File: $BACKUP_FILE"
echo "🌐 Target: Render Database"

# Parse connection string to handle SSL requirement of Render
# Render requires SSL mode to be required usually
export PGSSLMODE=require

# Check connectivity
echo "🔍 Checking connection..."
psql "$CONN_STRING" -c "\l" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Error: Cannot connect to Render Database. Check your connection string and IP Whitelist."
    exit 1
else
    echo "✅ Connection successful."
fi

# Confirm
read -p "⚠️  WARNING: This will OVERWRITE the database at '$CONN_STRING'. Continue? (y/N): " confirm
if [[ "$confirm" != "y" ]]; then
    echo "🚫 Operation cancelled."
    exit 0
fi

# Restore
echo "⏳ Restoring... (This may take a while)"
# Dùng psql nếu file là plain SQL
psql "$CONN_STRING" < "$BACKUP_FILE"

# Nếu file là binary custom format (ví dụ từ pg_dump -Fc), dùng lệnh dưới thay thế:
# pg_restore --verbose --clean --no-acl --no-owner -d "$CONN_STRING" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Restore failed."
fi