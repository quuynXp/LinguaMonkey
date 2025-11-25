# # Stage 1: Build the application
# FROM eclipse-temurin:21-jdk AS builder
# WORKDIR /app

# # Copy the entire project context (everything in D:\LinguaApp\LinguaVietnamesApp)
# # Thư mục code thật (mvnw) sẽ nằm ở /app/LinguaVietnamesApp/
# COPY . .

# # Fix line endings for mvnw (important for Windows hosts)
# # Sửa lỗi: Phải trỏ vào thư mục con
# RUN sed -i 's/\r$//' LinguaVietnameseApp/mvnw

# # Grant execute permissions
# # Sửa lỗi: Phải trỏ vào thư mục con
# RUN chmod +x LinguaVietnameseApp/mvnw

# # Đổi WORKDIR vào thư mục code
# WORKDIR /app/LinguaVietnameseApp

# # Build the package
# RUN ./mvnw clean package -DskipTests

# # Stage 2: Create the final, smaller image
# FROM eclipse-temurin:21-jre-alpine
# WORKDIR /app

# # Copy only the built .jar file from the builder stage
# # Sửa lỗi: Đường dẫn đến file jar cũng phải chính xác
# COPY --from=builder /app/LinguaVietnameseApp/target/*.jar app.jar

# EXPOSE 8080
# ENTRYPOINT ["java","-jar","/app/app.jar"]

# Build local
# FROM eclipse-temurin:21-jdk AS builder
# WORKDIR /app
# COPY LinguaVietnameseApp/ .

# RUN sed -i 's/\r$//' mvnw

# RUN chmod +x mvnw
# RUN ./mvnw dependency:go-offline
# RUN ./mvnw clean package -DskipTests

# FROM eclipse-temurin:21-jre-alpine
# WORKDIR /app
# COPY --from=builder /app/target/*.jar app.jar
# EXPOSE 8080
# ENTRYPOINT ["java","-jar","/app/app.jar"]



# Stage 1: Build the application
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# Copy the entire project context (everything in D:\LinguaApp\LinguaVietnamesApp)
# Thư mục code thật (mvnw) sẽ nằm ở /app/LinguaVietnamesApp/
COPY . .

# Fix line endings for mvnw (important for Windows hosts)
# Sửa lỗi: Phải trỏ vào thư mục con
RUN sed -i 's/\r$//' LinguaVietnameseApp/mvnw

# Grant execute permissions
# Sửa lỗi: Phải trỏ vào thư mục con
RUN chmod +x LinguaVietnameseApp/mvnw

# Đổi WORKDIR vào thư mục code
WORKDIR /app/LinguaVietnameseApp

# Build the package
RUN ./mvnw clean package -DskipTests

# Stage 2: Create the final, smaller image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy only the built .jar file from the builder stage
# Sửa lỗi: Đường dẫn đến file jar cũng phải chính xác
COPY --from=builder /app/LinguaVietnameseApp/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]

# Build local
# FROM eclipse-temurin:21-jdk AS builder
# WORKDIR /app
# COPY LinguaVietnameseApp/ .

# RUN sed -i 's/\r$//' mvnw

# RUN chmod +x mvnw
# RUN ./mvnw dependency:go-offline
# RUN ./mvnw clean package -DskipTests

# FROM eclipse-temurin:21-jre-alpine
# WORKDIR /app
# COPY --from=builder /app/target/*.jar app.jar
# EXPOSE 8080
# ENTRYPOINT ["java","-jar","/app/app.jar"]