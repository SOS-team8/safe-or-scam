package com.sos.backend.domain.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SignupRequest(
    @NotBlank
    String verificationToken,

    @NotBlank
    String password,

    @NotBlank
    String name
) {
}
