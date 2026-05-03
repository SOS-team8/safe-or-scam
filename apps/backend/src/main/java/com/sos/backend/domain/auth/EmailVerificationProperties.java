package com.sos.backend.domain.auth;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "auth.email-verification")
@Validated
public record EmailVerificationProperties(
    @Min(4) int codeLength,
    @Positive long expiresInSeconds,
    @Positive long cooldownSeconds,
    @Positive int dailyLimit,
    @Positive int maxAttempts
) {
}
