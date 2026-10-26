FROM sberworks.ru/spasibo/ci90000770_cot/cot-jreheadless17-alpine:1.0

ARG artifactPath
ENV javaOpts=""

WORKDIR /app

COPY ${artifactPath} /app/fde-api.jar

EXPOSE 8080

CMD java ${javaOpts} -jar fde-api.jar

USER spring:spring