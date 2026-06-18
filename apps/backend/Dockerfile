# ---- Build stage ----
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# 빌드 스크립트 + 래퍼 먼저 (레이어 캐싱)
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
COPY src ./src

RUN chmod +x gradlew && ./gradlew bootJar --no-daemon -x test

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# non-root 사용자
RUN groupadd --system app && useradd --system --gid app app

# 실행 가능한 boot jar만 복사 (*-plain.jar 는 패턴상 제외됨)
# plain jar 비활성화로 boot jar만 남음 → 버전 무관
COPY --from=builder /app/build/libs/*.jar app.jar

USER app
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

# Cloud Run이 주입하는 $PORT 존중 (없으면 8080)
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -Dserver.port=${PORT:-8080} -jar app.jar"]
