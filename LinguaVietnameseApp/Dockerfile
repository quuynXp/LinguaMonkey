FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# FIX: Copy từ ./LinguaVietnameseApp/LinguaVietnameseApp (context là root)
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/pom.xml ./
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/mvnw ./
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/.mvn ./.mvn

# Sửa line endings và cấp quyền
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

# Tải dependencies
RUN ./mvnw dependency:go-offline

# Copy toàn bộ source code
COPY ./LinguaVietnameseApp/LinguaVietnameseApp/src ./src

# Build
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy jar từ builder
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]