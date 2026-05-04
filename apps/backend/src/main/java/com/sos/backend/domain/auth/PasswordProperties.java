package com.sos.backend.domain.auth;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "auth.password")
@Validated
public record PasswordProperties(
    @Min(8) int minLength,
    @Positive int maxLength,
    @Min(10) int bcryptStrength
) {
}
