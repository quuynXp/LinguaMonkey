FROM eclipse-temurin:21-jdk AS builder

# Thiết lập WORKDIR ở cấp độ gốc của dự án
WORKDIR /app

# 1. Tải dependencies (tận dụng cache Docker hiệu quả)

# Đặt tên biến cho thư mục code chính để dễ bảo trì
ENV APP_DIR=LinguaVietnameseApp/LinguaVietnameseApp

# COPY các file cần thiết cho bước go-offline
COPY ${APP_DIR}/pom.xml ${APP_DIR}/
COPY ${APP_DIR}/mvnw ${APP_DIR}/
# Đảm bảo copy toàn bộ nội dung của .mvn, bao gồm .mvn/wrapper/maven-wrapper.properties
COPY ${APP_DIR}/.mvn ${APP_DIR}/.mvn

# Đổi WORKDIR vào thư mục code chứa pom.xml và mvnw
WORKDIR /app/${APP_DIR}

# Cấp quyền thực thi và sửa lỗi line endings cho mvnw
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Tải dependencies
RUN ./mvnw dependency:go-offline

# 2. Build ứng dụng

# COPY toàn bộ code còn lại
WORKDIR /app
COPY . .

# Quay lại thư mục code để build
WORKDIR /app/${APP_DIR}

# Cấp quyền thực thi và sửa lỗi line endings LẦN NỮA (sau khi COPY toàn bộ code)
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Build package
RUN ./mvnw clean install -DskipTests

# Stage 2: Create the final, smaller image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ENV APP_DIR=LinguaVietnameseApp/LinguaVietnameseApp

# Copy chỉ file .jar đã build từ builder stage
COPY --from=builder /app/${APP_DIR}/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]