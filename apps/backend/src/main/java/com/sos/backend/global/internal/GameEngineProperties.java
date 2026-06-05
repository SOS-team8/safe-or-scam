package com.sos.backend.global.internal;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "game-engine")
@Validated
public record GameEngineProperties(
    @NotBlank String baseUrl,
    @NotBlank String internalApiKey
) {
}
