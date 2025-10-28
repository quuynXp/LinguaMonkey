FROM node:20-alpine

RUN apk add --no-cache bash git

WORKDIR /app

COPY package*.json yarn.lock* ./

RUN npm install -g expo-cli \
    && npm install --legacy-peer-deps

COPY . .

EXPOSE 8081 19000 19001 19002

ENV CI=true \
    EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

CMD ["npx", "expo", "start", "--tunnel", "--non-interactive"]
