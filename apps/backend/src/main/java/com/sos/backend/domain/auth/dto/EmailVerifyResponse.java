package com.sos.backend.domain.auth.dto;

import com.sos.backend.global.auth.VerificationTokenProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailVerifyResponse(
    String verificationToken
) {
}
