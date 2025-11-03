#!/bin/sh
set -e

KONG_ADMIN="http://kong:8001"

echo ">>> Waiting for Kong Admin API..."
until curl -s $KONG_ADMIN/status > /dev/null; do
  sleep 2
done
echo ">>> Kong Admin API is ready!"

# === SERVICES ===
echo ">>> Configuring Services..."
curl -s -X POST $KONG_ADMIN/services -d "name=java-service" -d "url=http://linguavietnameseapp:8080" || true
curl -s -X POST $KONG_ADMIN/services -d "name=python-service" -d "url=http://pythonservice:8001" || true
curl -s -X POST $KONG_ADMIN/services -d "name=public-service" -d "url=http://linguavietnameseapp:8080" || true

# === ROUTES ===
echo ">>> Configuring Routes..."
# 1. java-service (protected)
curl -s -X POST $KONG_ADMIN/services/java-service/routes \
  -d "name=java-api" -d "paths[]=/api/v1" \
  -d "methods[]=GET" -d "methods[]=POST" -d "methods[]=PUT" -d "methods[]=DELETE" -d "methods[]=OPTIONS" || true

# 2. python-service (protected)
curl -s -X POST $KONG_ADMIN/services/python-service/routes \
  -d "name=python-ai" -d "paths[]=/ai" -d "paths[]=/v1/ai" || true

# 3. public-service (public)
curl -s -X POST $KONG_ADMIN/services/public-service/routes \
  -d "name=public-routes" -d "strip_path=false" \
  -d "paths[]=/api/v1/auth" -d "paths[]=/api/v1/users" -d "paths[]=/api/v1/users/check-email" \
  -d "paths[]=/api/v1/interests" -d "paths[]=/api/v1/character3ds" -d "paths[]=/api/v1/languages" \
  -d "paths[]=/api/v1/badge" -d "paths[]=/api/v1/certificates" -d "paths[]=/api/swagger" \
  -d "paths[]=/swagger-ui" -d "paths[]=/v3/api-docs" -d "paths[]=/health" || true

# === CONSUMERS ===
echo ">>> Configuring Consumers..."
curl -s -X POST $KONG_ADMIN/consumers -d "username=mobile-client" -d "custom_id=client-mobile-001" || true
curl -s -X POST $KONG_ADMIN/consumers -d "username=web-client" -d "custom_id=client-web-001" || true

# === JWT CREDENTIALS (RS256) ===
echo ">>> Configuring JWT Credentials..."
PUBLIC_KEY=$(cat <<EOF
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1LNS9rOO1cg//uC3GXvu
r6HIw9HsDRsU6r+yyV/RjioHLLwasQByDTJhMZfvRJkMmZWKLxam+v8p9tyDLBRa
/jm+LHrl37ZgRo3EnQeJvJRNWLr0Uahuqez8OLRXAKdydgZWf0B4fJxgN+RsSXP7
vWNm6idJ0h32M7Obnd8iJDP0+MXdgy2pVd8PUAVFcmS/+7VLcWj1V0gDoMbHscN1
kswUB8rykRF0m+v5l1jx4ldSX1eKeYoQdznRMjViUTkKuYf5vhTsApgbows5pzs4
6NxKcxxm2kHLDpa4TKexdSJX9ckDkFAA4Z5ohAwcDvMcwyn0BHJaxIjGtRRwQP+H
OQIDAQAB
-----END PUBLIC KEY-----
EOF
)

for user in mobile-client web-client; do
  curl -s -X POST $KONG_ADMIN/consumers/$user/jwt \
    -d "algorithm=RS256" -d "rsa_public_key=$PUBLIC_KEY" -d "key=lingua-key-v1" || true
done

# === GLOBAL CORS ===
echo ">>> Configuring Global CORS..."
curl -s -X POST $KONG_ADMIN/plugins \
  -d "name=cors" -d "config.origins=*" -d "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  -d "config.headers=*" -d "config.exposed_headers=*" -d "config.credentials=true" -d "config.max_age=3600" || true

# === JWT PLUGINS ===
echo ">>> Applying JWT Plugins..."
for svc in java-service python-service; do
  curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
    -d "name=jwt" -d "config.key_claim_name=kid" \
    -d "config.claims_to_verify=exp,nbf" -d "config.run_on_preflight=true" || true
done

# === RATE LIMITING (JAVA & PUBLIC) ===
echo ">>> Applying standard rate limit to java-service and public-service"
for svc in java-service public-service; do
  curl -s -X POST $KONG_ADMIN/services/$svc/plugins \
    -d "name=rate-limiting-advanced" -d "config.policy=redis" \
    -d "config.redis.host=redis" -d "config.redis.port=6379" -d "config.redis.password=redisPass123" \
    -d "config.algorithm=token_bucket" -d "config.tokens_per_sec=5" -d "config.burst=10" \
    -d "config.key=consumer" -d "config.deny_action=429" || true
done

# === RATE LIMITING (PYTHON - AI SERVICE) ===
echo ">>> Applying strict rate limit to python-service (AI)"
curl -s -X POST $KONG_ADMIN/services/python-service/plugins \
  -d "name=rate-limiting-advanced" \
  -d "config.policy=redis" \
  -d "config.redis.host=redis" \
  -d "config.redis.port=6379" \
  -d "config.redis.password=redisPass123" \
  -d "config.algorithm=token_bucket" \
  -d "config.tokens_per_sec=2" \
  -d "config.burst=3" \
  -d "config.key=consumer" \
  -d "config.deny_action=429" || true

echo ">>> Kong init completed successfully!"