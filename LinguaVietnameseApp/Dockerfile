# Stage 1: Build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# Copy toàn bộ context (đang đứng ở root repo)
COPY . .

# QUAN TRỌNG: Di chuyển vào thư mục code thật (Lớp thứ 2)
# Dựa trên ảnh: LinguaVietnameseApp (Outer) -> LinguaVietnameseApp (Inner)
WORKDIR /app/LinguaVietnameseApp/LinguaVietnameseApp

# Fix quyền và build
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy file JAR từ đúng thư mục target đã build ở trên
COPY --from=builder /app/LinguaVietnameseApp/LinguaVietnameseApp/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]