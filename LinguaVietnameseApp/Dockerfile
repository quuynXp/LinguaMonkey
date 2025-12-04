# === STAGE 1: BUILD ===
# Dùng Maven Image có sẵn JDK 21
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# 1. Copy pom.xml
# LƯU Ý: Đường dẫn tính từ Root Repo -> Folder Ngoài -> Folder Trong -> pom.xml
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/pom.xml .

# 2. Tải dependencies (Cache layer này nếu pom không đổi)
RUN mvn dependency:go-offline

# 3. Copy thư mục source code
# LƯU Ý: Đường dẫn tính từ Root Repo -> Folder Ngoài -> Folder Trong -> src
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/src ./src

# 4. Build package (Bỏ qua test để build nhanh cho Prod)
RUN mvn clean package -DskipTests

# === STAGE 2: RUNTIME ===
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy file jar đã build xong từ Stage 1
COPY --from=builder /app/target/*.jar app.jar

# Tạo thư mục config (để mount file google key nếu cần)
RUN mkdir -p /app/config

EXPOSE 8080
EXPOSE 9090

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]