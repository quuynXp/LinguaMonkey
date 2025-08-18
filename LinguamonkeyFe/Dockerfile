FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./

RUN npm install -g expo-cli \
    && npm install

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--tunnel"]
