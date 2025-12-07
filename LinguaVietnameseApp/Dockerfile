# === STAGE 1: BUILD ===
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

COPY ./LinguaVietnameseApp/LinguaVietnameseApp/pom.xml .

RUN mvn dependency:go-offline

COPY ./LinguaVietnameseApp/LinguaVietnameseApp/src ./src

RUN mvn clean package -DskipTests

# === STAGE 2: RUNTIME ===
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Cài đặt gettext (nếu cần cho envsubst), dos2unix (sửa lỗi CRLF), và bash (cần cho #!/bin/bash và lệnh tr)
RUN apk add --no-cache gettext dos2unix bash

COPY --from=builder /app/target/*.jar app.jar
COPY ./LinguaVietnameseApp/entrypoint.sh /app/entrypoint.sh

# Bước SỬA LỖI QUAN TRỌNG: Sửa định dạng dòng và cấp quyền thực thi
RUN dos2unix /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    mkdir -p /app/config

EXPOSE 8080
EXPOSE 9090

ENTRYPOINT ["/app/entrypoint.sh", "java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]