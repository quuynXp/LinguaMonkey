FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Copy the contents of the LinguaVietnameseApp folder from the root context to /app
COPY ./LinguaVietnameseApp .

# Fix line endings for the maven wrapper and grant execution permissions
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

# Download dependencies (Cached if pom.xml doesn't change)
RUN ./mvnw dependency:go-offline

# Build the application
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Ensure the config directory exists for Google keys if needed
RUN mkdir -p /app/config

EXPOSE 8080
EXPOSE 9090

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]