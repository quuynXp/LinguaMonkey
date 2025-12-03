#!/bin/bash
set -e

echo "--- Awaiting Database Readiness ---"
/opt/venv/bin/python /app/wait_for_db.py --host app-database --port 5432 --timeout 30

echo "--- 1. Running Data Seeding (CSV) ---"
# CHỈNH SỬA: Chạy script bằng module system, và thêm thư mục chứa 'src' vào PYTHONPATH
# (Giả sử thư mục code chính là /app/PythonService)
export PYTHONPATH="/app/PythonService:$PYTHONPATH"
/opt/venv/bin/python -m src.scripts.seed_lexicon

echo "--- 2. Starting Main Application Command ---"
exec "$@"