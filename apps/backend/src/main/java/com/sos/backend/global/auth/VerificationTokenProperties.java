package com.sos.backend.global.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "auth.verification-token")
@Validated
public record VerificationTokenProperties(
    @NotBlank
    @Size(min = 32, message = "auth.verification-token.secret는 32자 이상이어야 합니다")
    String secret,
    @Positive long expiresInSeconds
) {
}
