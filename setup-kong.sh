#!/bin/bash
set -e

ADMIN_URL="http://localhost:8001"

echo "🔄 Chờ Kong sẵn sàng..."
until curl -s $ADMIN_URL >/dev/null; do
  sleep 2
done
echo "✅ Kong đã sẵn sàng!"

# 1. Tạo service & route
echo "📦 Tạo service và route..."
curl -s -X POST $ADMIN_URL/services \
  --data name=java-service \
  --data url='http://linguavietnameseapp:80' >/dev/null

curl -s -X POST $ADMIN_URL/services/java-service/routes \
  --data 'name=java-service-route' \
  --data 'paths[]=/api/v1' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE' >/dev/null

# 2. Tạo consumer
echo "👤 Tạo consumer svc-client & admin-client..."
curl -s -X POST $ADMIN_URL/consumers --data "username=svc-client" >/dev/null
curl -s -X POST $ADMIN_URL/consumers --data "username=admin-client" >/dev/null

# 3. Gắn JWT key cho mỗi consumer
echo "🔑 Gắn RSA key cho consumers..."
curl -s -X POST $ADMIN_URL/consumers/svc-client/jwt \
  --data "algorithm=RS256" \
  --data "key=svc-client-key" \
  --data "rsa_public_key=$(cat keys/svc-client.pub)" >/dev/null

curl -s -X POST $ADMIN_URL/consumers/admin-client/jwt \
  --data "algorithm=RS256" \
  --data "key=admin-client-key" \
  --data "rsa_public_key=$(cat keys/admin-client.pub)" >/dev/null

# 4. Bật JWT plugin cho route
echo "⚙️  Bật JWT plugin cho route..."
curl -s -X POST $ADMIN_URL/routes/java-service-route/plugins \
  --data "name=jwt" \
  --data "config.key_claim_name=kid" \
  --data "config.run_on_preflight=true" \
  --data "config.maximum_expiration=86400" >/dev/null

# 5. Bật rate-limiting-advanced plugin
echo "🚦 Bật rate-limiting plugin..."
curl -s -X POST $ADMIN_URL/routes/java-service-route/plugins \
  --data "name=rate-limiting-advanced" \
  --data "config.policy=redis" \
  --data "config.algorithm=token_bucket" \
  --data "config.redis.host=redis" \
  --data "config.redis.port=6379" \
  --data "config.redis.password=redisPass123" \
  --data "config.tokens_per_period=2" \
  --data "config.burst=5" \
  --data "config.key_type=consumer" >/dev/null

echo "✅ Cấu hình hoàn tất!"
