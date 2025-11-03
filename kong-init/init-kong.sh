#!/bin/sh
set -e

KONG_ADMIN="http://kong:8001"
# Đợi Kong sẵn sàng
echo ">>> Waiting for Kong Admin API..."
until curl -s $KONG_ADMIN/status > /dev/null; do
  sleep 2
done
echo ">>> Kong Admin API is ready!"

# === SERVICES ===
# Các service backend của bạn. Kong sẽ proxy request đến các URL này.
echo ">>> Configuring Services..."
curl -s -X POST $KONG_ADMIN/services -d "name=java-service" -d "url=http://linguavietnameseapp:8080" || true
curl -s -X POST $KONG_ADMIN/services -d "name=python-service" -d "url=http://pythonservice:8001" || true # Giả sử python chạy nội bộ trên port 8001
curl -s -X POST $KONG_ADMIN/services -d "name=public-java-service" -d "url=http://linguavietnameseapp:8080" || true

# === ROUTES ===
# Định nghĩa các "đường" để client truy cập vào service
echo ">>> Configuring Routes..."

# --- Routes cho Public Java Service (Không cần JWT) ---
# Các endpoint public (auth, swagger, một số API GET)
curl -s -X POST $KONG_ADMIN/services/public-java-service/routes \
  -d "name=public-routes" \
  -d "strip_path=false" \
  -d "paths[]=/api/v1/auth/" -d "paths[]=/api/v1/users/check-email" \
  -d "paths[]=/api/v1/interests" -d "paths[]=/api/v1/character3ds" \
  -d "paths[]=/api/v1/languages" -d "paths[]=/api/v1/badge" \
  -d "paths[]=/api/v1/certificates" -d "paths[]=/api/swagger" \
  -d "paths[]=/swagger-ui/" -d "paths[]=/v3/api-docs/" \
  -d "paths[]=/api/v1/users" \
  -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=OPTIONS" || true

# --- Routes cho Protected Java Service (Cần JWT) ---
# 1. API REST được bảo vệ (ví dụ: /api/v1/chat/)
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
  -d "name=java-api-protected" \
  -d "strip_path=false" \
  -d "paths[]=/api/v1/chat/" \
  -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=PUT" -d "methods[]=DELETE" -d "methods[]=OPTIONS" || true
# (Bạn có thể thêm các path được bảo vệ khác ở đây, ví dụ: -d "paths[]=/api/v1/profile/")

# 2. STOMP/WebSocket cho Java
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
  -d "name=java-stomp" \
  -d "strip_path=false" \
  -d "paths[]=/ws/" \
  -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=OPTIONS" || true

# --- Routes cho Protected Python Service (Cần JWT) ---
# 1. API REST cho Python (AI/Translate)
curl -s -X POST $KONG_ADMIN/services/python-service/routes \
  -d "name=python-api" \
  -d "strip_path=true" \
  -d "paths[]=/api/py/" \
  -d "methods[]=POST" -d "methods[]=OPTIONS" || true
# (FE gọi /api/py/translate, Kong chuyển đến /translate của python-service)

# 2. WebSocket cho Python (Voice)
curl -s -X POST $KONG_ADMIN/services/python-service/routes \
  -d "name=python-ws" \
  -d "strip_path=true" \
  -d "paths[]=/ws/py/" \
  -d "methods[]=GET" -d "methods[]=OPTIONS" || true
# (FE gọi /ws/py/voice, Kong chuyển đến /ws/voice của python-service)


# === CONSUMERS & JWT (Giữ nguyên) ===
echo ">>> Configuring Consumers..."
curl -s -X POST $KONG_ADMIN/consumers -d "username=mobile-client" || true
curl -s -X POST $KONG_ADMIN/consumers -d "username=web-client" || true

echo ">>> Configuring JWT Credentials..."
# Đọc public key từ file đã mount
PUBLIC_KEY_CONTENT=$(cat /scripts/public_key.pem)

for user in mobile-client web-client; do
  curl -s -X POST $KONG_ADMIN/consumers/$user/jwt \
    -F "algorithm=RS256" \
    -F "rsa_public_key=$PUBLIC_KEY_CONTENT" \
    -F "key=lingua-key-v1" || true
done

# === GLOBAL CORS (Giữ nguyên) ===
echo ">>> Configuring Global CORS..."
curl -s -X POST $KONG_ADMIN/plugins \
  -d "name=cors" -d "config.origins=*" -d "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  -d "config.headers=*" -d "config.exposed_headers=*" -d "config.credentials=true" -d "config.max_age=3600" || true

# === PLUGINS BẢO MẬT (Quan trọng) ===

# --- 1. Áp dụng JWT cho các service cần bảo vệ ---
echo ">>> Applying JWT Plugins to services..."
for svc in java-service python-service; do
  curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
    -d "name=jwt" -d "config.key_claim_name=kid" \
    -d "config.claims_to_verify=exp,nbf" -d "config.run_on_preflight=true" || true
done

# --- 2. Biến đổi Request cho Python WebSocket (Rất quan trọng) ---
# Plugin JWT của Kong mặc định không đọc query param.
# Ta dùng request-transformer để copy ?token=... vào header Authorization
# để plugin JWT có thể đọc và xác thực nó.
echo ">>> Applying Request Transformer to python-ws route..."
curl -s -X POST $KONG_ADMIN/routes/python-ws/plugins \
  -d "name=request-transformer" \
  -d "config.add.headers=Authorization:Bearer $(query_params.token)" || true

# --- 3. Rate Limiting (Giữ nguyên) ---
echo ">>> Applying Rate Limiting..."
# (Giữ nguyên các cấu hình rate-limiting của bạn)
for svc in java-service public-java-service; do
  curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
    -d "name=rate-limiting-advanced" -d "config.policy=redis" \
    -d "config.redis.host=redis" -d "config.redis.port=6379" -d "config.redis.password=redisPass123" \
    -d "config.algorithm=token_bucket" -d "config.tokens_per_sec=5" -d "config.burst=10" \
    -d "config.key=consumer" -d "config.deny_action=429" || true
done
curl -s -X POST $KONG_ADMIN/services/python-service/plugins \
  -d "name=rate-limiting-advanced" -d "config.policy=redis" \
  -d "config.redis.host=redis" -d "config.redis.port=6379" -d "config.redis.password=redisPass123" \
  -d "config.algorithm=token_bucket" -d "config.tokens_per_sec=2" -d "config.burst=3" \
  -d "config.key=consumer" -d "config.deny_action=429" || true


echo ">>> Kong init completed successfully!"