# === STAGE 1: BUILD ===
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

COPY ./LinguaVietnameseApp/pom.xml .

RUN mvn dependency:go-offline

COPY ./LinguaVietnameseApp/src ./src

RUN mvn clean package -DskipTests

# === STAGE 2: RUNTIME ===
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN apk add --no-cache gettext dos2unix bash

COPY --from=builder /app/target/*.jar app.jar
COPY ./LinguaVietnameseApp/entrypoint.sh /app/entrypoint.sh

RUN dos2unix /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    mkdir -p /app/config

EXPOSE 10000 
EXPOSE 9090

ENTRYPOINT ["/app/entrypoint.sh", "java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]