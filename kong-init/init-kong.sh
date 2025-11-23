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
echo ">>> Configuring Services..."
# Lưu ý: Sẽ có lỗi "UNIQUE violation" nếu service đã tồn tại, dùng || true để bỏ qua.
curl -s -X POST $KONG_ADMIN/services -d "name=java-service" -d "url=http://linguavietnameseapp:8080" || true
curl -s -X POST $KONG_ADMIN/services -d "name=python-service" -d "url=http://pythonservice:8001" || true
curl -s -X POST $KONG_ADMIN/services -d "name=public-java-service" -d "url=http://linguavietnameseapp:8080" || true


# === ROUTES ===
echo ">>> Configuring Routes..."

# --- Routes cho Public Java Service (Không cần JWT) ---
echo ">>> Configuring Public Java Routes..."
curl -s -X POST $KONG_ADMIN/services/public-java-service/routes \
    -d "name=public-routes" \
    -d "strip_path=false" \
    -d "paths[]=/api/v1/auth" \
    -d "paths[]=/api/v1/users/check-email" \
    -d "paths[]=/api/swagger" \
    -d "paths[]=/swagger-ui/" \
    -d "paths[]=/v3/api-docs/" \
    -d "paths[]=/api/v1/badges" \
    -d "paths[]=/api/v1/basic-lessons" \
    -d "paths[]=/api/v1/certificates" \
    -d "paths[]=/api/v1/character3ds" \
    -d "paths[]=/api/v1/courses" \
    -d "paths[]=/api/v1/course-discounts" \
    -d "paths[]=/api/v1/course-reviews" \
    -d "paths[]=/api/v1/events" \
    -d "paths[]=/api/v1/grammar" \
    -d "paths[]=/api/v1/interests" \
    -d "paths[]=/api/v1/languages" \
    -d "paths[]=/api/v1/leaderboards" \
    -d "paths[]=/api/v1/leaderboard-entries" \
    -d "paths[]=/api/v1/lesson-categories" \
    -d "paths[]=/api/v1/lessons" \
    -d "paths[]=/api/v1/lesson-questions" \
    -d "paths[]=/api/v1/lesson-reviews" \
    -d "paths[]=/api/v1/lesson-series" \
    -d "paths[]=/api/v1/lesson-sub-categories" \
    -d "paths[]=/api/v1/roadmaps" \
    -d "paths[]=/api/v1/search" \
    -d "paths[]=/api/v1/skill-lessons" \
    -d "paths[]=/api/v1/videos" \
    -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=OPTIONS" || true


# --- Routes cho Protected Java Service (Cần JWT) ---
echo ">>> Configuring Protected Java Routes..."
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
    -d "name=java-api-protected" \
    -d "strip_path=false" \
    -d "paths[]=/api/v1/chat" \
    -d "paths[]=/api/v1/couples" \
    -d "paths[]=/api/v1/course-enrollments" \
    -d "paths[]=/api/v1/course-lessons" \
    -d "paths[]=/api/v1/daily-challenges" \
    -d "paths[]=/api/v1/files" \
    -d "paths[]=/api/v1/flashcards" \
    -d "paths[]=/api/v1/friendships" \
    -d "paths[]=/api/v1/group-answers" \
    -d "paths[]=/api/v1/group-sessions" \
    -d "paths[]=/api/v1/lesson-order-in-series" \
    -d "paths[]=/api/v1/lesson-progress" \
    -d "paths[]=/api/v1/lesson-progress-wrong-items" \
    -d "paths[]=/api/v1/matchmaking" \
    -d "paths[]=/api/v1/media" \
    -d "paths[]=/api/v1/memorizations" \
    -d "paths[]=/api/v1/notifications" \
    -d "paths[]=/api/v1/permissions" \
    -d "paths[]=/api/v1/roles" \
    -d "paths[]=/api/v1/rooms" \
    -d "paths[]=/api/v1/statistics" \
    -d "paths[]=/api/v1/tests" \
    -d "paths[]=/api/v1/transactions" \
    -d "paths[]=/api/v1/users/" \
    -d "paths[]=/api/v1/users" \
    -d "paths[]=/api/v1/user-goals" \
    -d "paths[]=/api/v1/user-learning-activities" \
    -d "paths[]=/api/v1/video-calls" \
    -d "paths[]=/api/v1/wallets" \
    -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=PUT" -d "methods[]=DELETE" \
    -d "methods[]=PATCH" -d "methods[]=OPTIONS" || true


# --- Routes cho STOMP/WebSocket (Java) ---
echo ">>> Configuring STOMP/WebSocket Route and Plugin (Java)..."
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
    -d "name=java-stomp" -d "strip_path=false" -d "paths[]=/ws/" \
    -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=OPTIONS" || true
curl -s -X POST $KONG_ADMIN/routes/java-stomp/plugins \
    -d "name=request-transformer" \
    -d "config.add.headers=X-Auth-Token:\$(header.authorization)" || true


# --- Routes cho WebSocket (Python) ---
curl -s -X POST $KONG_ADMIN/services/python-service/routes \
    -d "name=python-api" -d "strip_path=true" -d "paths[]=/api/py/" \
    -d "methods[]=POST" -d "methods[]=OPTIONS" || true

curl -s -X POST $KONG_ADMIN/services/python-service/routes \
    -d "name=python-ws" -d "strip_path=true" -d "paths[]=/ws/py/" \
    -d "methods[]=GET" -d "methods[]=OPTIONS" || true


# === CONSUMERS & JWT (Giữ nguyên) ===
echo ">>> Configuring Consumers..."
curl -s -X POST $KONG_ADMIN/consumers -d "username=mobile-client" || true
curl -s -X POST $KONG_ADMIN/consumers -d "username=web-client" || true

echo ">>> Configuring JWT Credentials..."
PUBLIC_KEY_CONTENT=$(cat /keys/public_key.pem)
for user in mobile-client web-client; do
    curl -s -X POST $KONG_ADMIN/consumers/$user/jwt \
        -F "algorithm=RS256" \
        -F "rsa_public_key=$PUBLIC_KEY_CONTENT" \
        -F "key=lingua-key-v1" || true
done


# === GLOBAL CORS (Giữ nguyên) ===
echo ">>> Configuring Global CORS..."
curl -s -X POST $KONG_ADMIN/plugins \
    -d "name=cors" \
    -d "config.origins=*" \
    -d "config.methods=GET" -d "config.methods=POST" -d "config.methods=PUT" -d "config.methods=DELETE" -d "config.methods=PATCH" \
    -d "config.headers=*" \
    -d "config.exposed_headers=*" \
    -d "config.credentials=true" -d "config.max_age=3600" || true


# === PLUGINS BẢO MẬT (API thường) ===
echo ">>> Applying Request Transformer to copy Auth header for regular services..."
for svc in java-service python-service; do
    curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
        -d "name=request-transformer" \
        -d "config.add.headers=X-Auth-Token:\$(header.authorization)" || true
done


echo ">>> Applying JWT Plugins to services..."
for svc in java-service python-service; do
    curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
        -d "name=jwt" \
        -d "config.key_claim_name=kid" \
        -d "config.claims_to_verify=exp" \
        -d "config.claims_to_verify=nbf" || true
done


# === Rate Limiting (Giữ nguyên) ===
echo ">>> Applying Rate Limiting..."
for svc in java-service public-java-service; do
    curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
        -d "name=rate-limiting" \
        -d "config.policy=redis" \
        -d "config.redis.host=redis" \
        -d "config.redis.port=6379" \
        -d "config.redis.password=redisPass123" \
        -d "config.limit_by=consumer" \
        -d "config.second=5" \
        -d "config.minute=100" || true
done


curl -s -X POST $KONG_ADMIN/services/python-service/plugins \
    -d "name=rate-limiting" \
    -d "config.policy=redis" \
    -d "config.redis.host=redis" \
    -d "config.redis.port=6379" \
    -d "config.redis.password=redisPass123" \
    -d "config.limit_by=consumer" \
    -d "config.second=2" \
    -d "config.minute=50" || true


echo ">>> Kong init completed successfully!"