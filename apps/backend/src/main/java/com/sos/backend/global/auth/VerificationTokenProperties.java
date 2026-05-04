package com.sos.backend.global.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "auth.verification-token")
@Validated
public record VerificationTokenProperties(
    @NotBlank String secret,
    @Positive long expiresInSeconds
) {
}
