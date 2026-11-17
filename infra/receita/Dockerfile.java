# syntax=docker/dockerfile:1.7
#
# Imagens das calculadoras oficiais da Receita Federal (Regime Geral e Simples Nacional).
# O código vem dos submódulos em ./vendor (sem alterações). O banco SQLite é gerado
# em build time a partir das migrações Flyway publicadas no repo do Regime Geral,
# que também contêm as tabelas do Simples Nacional.
#
# Contexto de build: infra/receita
# Alvos: regime-geral | simples-nacional
#
# Redes corporativas/proxy com TLS interceptado: passe a CA com
#   --secret id=ca,src=/caminho/ca.crt
# (opcional; sem o secret, nada muda).

ARG JDK_IMAGE=eclipse-temurin:21-jdk
ARG JRE_IMAGE=eclipse-temurin:21-jre

# ---------- base de build ----------
FROM ${JDK_IMAGE} AS jdk
# JAVA_TOOL_OPTIONS opcional (ex.: proxy -Dhttps.proxyHost=...); só no estágio de build
ARG JAVA_TOOL_OPTIONS=""
ENV JAVA_TOOL_OPTIONS=${JAVA_TOOL_OPTIONS}
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then \
      cp /run/secrets/ca /usr/local/share/ca-certificates/extra-ca.crt && update-ca-certificates >/dev/null && \
      mkdir -p /tmp/ca && awk 'BEGIN{n=0} /BEGIN CERT/{n++} {print > ("/tmp/ca/c" n ".pem")}' /run/secrets/ca && \
      for f in /tmp/ca/c*.pem; do \
        keytool -importcert -noprompt -cacerts -storepass changeit -alias "extra-$(basename $f .pem)" -file "$f" >/dev/null 2>&1 || true; \
      done && rm -rf /tmp/ca; \
    fi

# ---------- banco de dados (Flyway -> SQLite) ----------
FROM jdk AS db
WORKDIR /src
COPY vendor/calculadora-rtc-regime-regular/ ./
RUN --mount=type=cache,target=/root/.m2 \
    mkdir -p calculadora/db && \
    ./mvnw -B -q flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf --errors && \
    ls -lh calculadora/db/calculadora-pro.db

# ---------- build Regime Geral ----------
FROM jdk AS build-regime-geral
WORKDIR /src
COPY vendor/calculadora-rtc-regime-regular/ ./
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -q -DskipTests package && cp target/api-regime-geral.jar /app.jar

# ---------- build Simples Nacional ----------
FROM jdk AS build-simples-nacional
WORKDIR /src
COPY vendor/calculadora-rtc-simples-nacional/ ./
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -q -DskipTests package && cp target/api-simples-nacional.jar /app.jar

# ---------- runtime comum ----------
FROM ${JRE_IMAGE} AS runtime
RUN useradd --system --uid 10001 app
WORKDIR /app
COPY --from=db /src/calculadora/db/calculadora-pro.db /app/calculadora/db/calculadora-pro.db
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Dspring.profiles.active=offline"
USER app
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

FROM runtime AS regime-geral
COPY --from=build-regime-geral /app.jar /app/app.jar
EXPOSE 8080

FROM runtime AS simples-nacional
COPY --from=build-simples-nacional /app.jar /app/app.jar
EXPOSE 8082
