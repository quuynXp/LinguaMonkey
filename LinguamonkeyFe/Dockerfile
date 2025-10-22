# Sử dụng image Node nhẹ, đủ để chạy expo
FROM node:20-alpine

# Cài đặt các gói cần thiết
RUN apk add --no-cache bash git

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file package trước để cache layer install
COPY package*.json yarn.lock* ./

# Cài đặt expo-cli toàn cục + dependencies
RUN npm install -g expo-cli \
    && npm install --legacy-peer-deps

# Copy toàn bộ source code
COPY . .

# Expo thường sử dụng 19000 (Metro bundler), 19001 (WebSocket), 19002 (DevTools)
EXPOSE 8081 19000 19001 19002

# Thiết lập biến môi trường để expo không đòi hỏi TTY
ENV CI=true \
    EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

# Lệnh chạy expo
CMD ["npx", "expo", "start", "--tunnel", "--non-interactive"]
