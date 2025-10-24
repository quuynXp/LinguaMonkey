#!/bin/bash
echo "🧩 Building JS bundle for Expo..."
expo export:embed --eager --platform android --dev false
