# === STAGE 1: BUILD (Dùng Maven Image chuẩn) ===
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# 1. Copy pom.xml trước để cache dependencies
# Lưu ý: Context là Root, nên đường dẫn là ./LinguaVietnameseApp/pom.xml
COPY ./LinguaVietnameseApp/pom.xml .

# 2. Tải dependencies (sẽ được cache nếu pom.xml không đổi)
RUN mvn dependency:go-offline

# 3. Copy source code
COPY ./LinguaVietnameseApp/src ./src

# 4. Build application (Bỏ qua test để build nhanh hơn trên prod)
RUN mvn clean package -DskipTests

# === STAGE 2: RUNTIME ===
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy file jar từ stage builder
COPY --from=builder /app/target/*.jar app.jar

# Tạo thư mục config để tránh lỗi thiếu thư mục khi mount key Google
RUN mkdir -p /app/config

EXPOSE 8080
EXPOSE 9090

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]