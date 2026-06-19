package com.sos.backend.global.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "jwt")
@Validated
public record JwtProperties(
    @NotBlank String secret,
    @Positive long accessTokenExpiration,
    @Positive long refreshTokenExpiration
) {
}
