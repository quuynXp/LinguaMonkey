#!/bin/bash
set -e

BACKUP_FILE="/docker-entrypoint-initdb.d/backups/mydb.bak"
DBNAME="${POSTGRES_DB:-appdb}"
USER="${POSTGRES_USER:-postgres}"

if [ -f "$BACKUP_FILE" ]; then
  echo "Found backup file: $BACKUP_FILE"
  if pg_restore --version >/dev/null 2>&1; then
    echo "Attempting pg_restore --format=custom"
    psql -v ON_ERROR_STOP=1 --username "$USER" <<-EOSQL
      CREATE DATABASE "$DBNAME";
    EOSQL || true
    if pg_restore -d "$DBNAME" "$BACKUP_FILE"; then
      echo "pg_restore completed."
      exit 0
    else
      echo "pg_restore failed; attempting psql (maybe plain SQL)"
    fi
  fi

  if psql -v ON_ERROR_STOP=1 --username "$USER" -d "$DBNAME" < "$BACKUP_FILE"; then
    echo "psql restore completed."
  else
    echo "Restore failed. Please check the format of the backup file."
    exit 1
  fi
else
  echo "No backup file found at $BACKUP_FILE. Skipping restore."
fi
