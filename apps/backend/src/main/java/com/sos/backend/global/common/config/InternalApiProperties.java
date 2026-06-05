package com.sos.backend.global.common.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * 서버 간(game-engine >> backend) 내부 호출 인증용 공유 시크릿.
 * game-engine 의 INTERNAL_API_KEY 와 동일한 값이어야 한다.
 */
@ConfigurationProperties(prefix = "app.internal")
@Validated
public record InternalApiProperties(
    @NotBlank
    String apiKey
) {
}
