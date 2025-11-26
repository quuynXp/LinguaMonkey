FROM eclipse-temurin:21-jdk AS builder

# Thiết lập WORKDIR ở cấp độ gốc của dự án
WORKDIR /app

# 1. Tải dependencies (tận dụng cache Docker hiệu quả)
# Chỉ COPY các file cấu hình dependency (pom.xml) trước để build cache
COPY LinguaVietnameseApp/LinguaVietnameseApp/pom.xml /app/LinguaVietnameseApp/LinguaVietnameseApp/
WORKDIR /app/LinguaVietnameseApp/LinguaVietnameseApp

# Tải dependencies mà không build code (sẽ sử dụng cache trừ khi pom.xml thay đổi)
RUN ./mvnw dependency:go-offline

# 2. Build ứng dụng
# COPY toàn bộ code còn lại
WORKDIR /app
COPY . .

# Fix line endings và cấp quyền cho mvnw
RUN sed -i 's/\r$//' LinguaVietnameseApp/LinguaVietnameseApp/mvnw
RUN chmod +x LinguaVietnameseApp/LinguaVietnameseApp/mvnw

# Quay lại thư mục code để build
WORKDIR /app/LinguaVietnameseApp/LinguaVietnameseApp
# Build package
RUN ./mvnw clean install -DskipTests

# Stage 2: Create the final, smaller image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy chỉ file .jar đã build từ builder stage
COPY --from=builder /app/LinguaVietnameseApp/LinguaVietnameseApp/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]