FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

COPY LinguaVietnameseApp/ .

RUN chmod +x mvnw

RUN ./mvnw dependency:go-offline
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
