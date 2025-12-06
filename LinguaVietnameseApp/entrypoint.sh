#!/bin/sh

mkdir -p /app/config

if [ -n "$FIREBASE_CREDENTIALS_BASE64" ]; then
    echo "$FIREBASE_CREDENTIALS_BASE64" | base64 -d > /app/config/service-account-key.json
    echo "Generated /app/config/service-account-key.json"
fi

if [ -n "$GDRIVE_KEY_BASE64" ]; then
    echo "$GDRIVE_KEY_BASE64" | base64 -d > /app/config/gdrive-key.json
    echo "Generated /app/config/gdrive-key.json"
fi

exec "$@"