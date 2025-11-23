#!/bin/bash
# scripts/pull-keystore.sh

echo "🔧 syncing Android credentials..."

npx eas-cli credentials --platform android --profile production

echo "✅ Keystore downloaded. You can now run your build script."