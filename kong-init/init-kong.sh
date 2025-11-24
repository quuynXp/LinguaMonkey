#!/bin/sh
set -e

KONG_ADMIN="http://kong:8001"

echo ">>> Waiting for Kong Admin API..."
until curl -s $KONG_ADMIN/status > /dev/null; do
  sleep 2
done
echo ">>> Kong Admin API is ready!"

# ====================================================
# 1. SERVICES
# ====================================================
echo ">>> Configuring Services..."

# Java Service
curl -s -X POST $KONG_ADMIN/services \
    -d "name=java-service" \
    -d "url=http://linguavietnameseapp:8080" || true

# Python Service
curl -s -X POST $KONG_ADMIN/services \
    -d "name=python-service" \
    -d "url=http://pythonservice:8001" \
    -d "connect_timeout=60000" \
    -d "write_timeout=300000" \
    -d "read_timeout=300000" || true

# ====================================================
# 2. ROUTES
# ====================================================
echo ">>> Configuring Routes..."

# Java API
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
    -d "name=java-api-all" \
    -d "strip_path=false" \
    -d "paths[]=/api/v1" \
    -d "paths[]=/api/swagger" \
    -d "paths[]=/swagger-ui" \
    -d "paths[]=/v3/api-docs" \
    -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=PUT" -d "methods[]=DELETE" -d "methods[]=PATCH" -d "methods[]=OPTIONS" || true

# Java WebSocket
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
    -d "name=java-stomp" \
    -d "strip_path=false" \
    -d "paths[]=/ws/" \
    -d "protocols[]=http" -d "protocols[]=https" \
    -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=OPTIONS" || true

# Python API
curl -s -X POST $KONG_ADMIN/services/python-service/routes \
    -d "name=python-api" -d "strip_path=true" -d "paths[]=/api/py/" \
    -d "methods[]=POST" -d "methods[]=OPTIONS" || true

# Python WebSocket
curl -s -X POST $KONG_ADMIN/services/python-service/routes \
    -d "name=python-ws" -d "strip_path=true" -d "paths[]=/ws/py/" \
    -d "protocols[]=http" -d "protocols[]=https" \
    -d "methods[]=GET" -d "methods[]=OPTIONS" || true


# ====================================================
# 3. PLUGINS (Bỏ JWT, giữ CORS và Rate Limit)
# ====================================================
echo ">>> Applying Plugins..."

# Global CORS (Bắt buộc phải có để Client gọi được)
curl -s -X POST $KONG_ADMIN/plugins \
    -d "name=cors" \
    -d "config.origins=*" \
    -d "config.methods=GET" -d "config.methods=POST" -d "config.methods=PUT" -d "config.methods=DELETE" -d "config.methods=PATCH" \
    -d "config.headers=*" \
    -d "config.exposed_headers=*" \
    -d "config.credentials=true" -d "config.max_age=3600" || true

# Rate Limiting cho Java (Giữ nguyên)
curl -s -X POST $KONG_ADMIN/services/java-service/plugins \
    -d "name=rate-limiting" \
    -d "config.policy=redis" \
    -d "config.redis_host=redis" \
    -d "config.redis_password=redisPass123" \
    -d "config.limit_by=consumer" \
    -d "config.second=20" \
    -d "config.minute=500" || true

# XÓA PLUGIN JWT CHO PYTHON (Nếu trước đó đã lỡ add, lệnh này đảm bảo xóa sạch config cũ nếu chạy lại container DB mới,
# nhưng vì script init chạy kiểu "thêm mới", tốt nhất là bạn reset DB Kong hoặc xóa tay plugin nếu script này chạy trên DB cũ).
# Tuy nhiên, nếu bạn dùng lệnh docker-compose run init như bên dưới, nó sẽ chỉ cố gắng add cái mới.
# Để chắc ăn nhất, script này chỉ ADD các cái cần thiết. Việc bỏ đoạn add JWT ở trên là đủ cho môi trường sạch.

echo ">>> Kong init completed!"