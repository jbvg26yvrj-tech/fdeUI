FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
ARG JAR=target/fde-api-2.0.0.jar
COPY ${JAR} /app/app.jar
USER 1001:1001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
