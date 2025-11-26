FROM eclipse-temurin:21-jdk AS builder

# Thiết lập WORKDIR ở cấp độ gốc của dự án
WORKDIR /app

# 1. Tải dependencies (tận dụng cache Docker hiệu quả)
# COPY chỉ các file cấu hình dependency và mvnw
# Giả định cấu trúc code: /app/LinguaVietnameseApp/LinguaVietnameseApp/
COPY LinguaVietnameseApp/LinguaVietnameseApp/pom.xml /app/LinguaVietnameseApp/LinguaVietnameseApp/
COPY LinguaVietnameseApp/LinguaVietnameseApp/mvnw /app/LinguaVietnameseApp/LinguaVietnameseApp/
COPY LinguaVietnameseApp/LinguaVietnameseApp/.mvn /app/LinguaVietnameseApp/LinguaVietnameseApp/.mvn

# Đổi WORKDIR vào thư mục code chứa pom.xml và mvnw
WORKDIR /app/LinguaVietnameseApp/LinguaVietnameseApp

# Cấp quyền thực thi và sửa lỗi line endings cho mvnw (cho caching)
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Tải dependencies (sẽ sử dụng cache trừ khi pom.xml thay đổi)
RUN ./mvnw dependency:go-offline

# 2. Build ứng dụng
# COPY toàn bộ code còn lại (thao tác này có thể làm mất quyền thực thi của mvnw)
WORKDIR /app
COPY . .

# Quay lại thư mục code để build
WORKDIR /app/LinguaVietnameseApp/LinguaVietnameseApp

# Cấp quyền thực thi và sửa lỗi line endings LẦN NỮA (sau khi COPY toàn bộ code)
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Build package
RUN ./mvnw clean install -DskipTests

# Stage 2: Create the final, smaller image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy chỉ file .jar đã build từ builder stage
COPY --from=builder /app/LinguaVietnameseApp/LinguaVietnameseApp/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]