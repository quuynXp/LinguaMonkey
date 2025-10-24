#!/bin/bash
while IFS= read -r line; do
  if [[ "$line" == \#* || -z "$line" ]]; then
    continue
  fi
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  echo "🟢 Creating secret: $key"
  eas secret:create --name "$key" --value "$value" --type=string
done < .env