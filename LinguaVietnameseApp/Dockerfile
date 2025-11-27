FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Copy toàn bộ thư mục LinguaVietnameseApp
COPY ./LinguaVietnameseApp/LinguaVietnameseApp ./

# Debug: Kiểm tra file có được copy chưa
RUN ls -la .mvn/wrapper/ || echo "KHONG CO FILE .mvn/wrapper/"

# Sửa line endings và cấp quyền
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

# Tải dependencies
RUN ./mvnw dependency:go-offline

# Build
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]