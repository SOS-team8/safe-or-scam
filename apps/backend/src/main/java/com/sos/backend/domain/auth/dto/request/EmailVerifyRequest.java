package com.sos.backend.domain.auth.dto.request;

import com.sos.backend.domain.auth.enums.VerificationPurpose;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record EmailVerifyRequest(
    @NotBlank
    @Email
    String email,

    @NotBlank
    @Pattern(regexp = "\\d{6}", message = "인증 코드는 6자리 숫자여야 합니다")
    String code,

    @NotNull
    VerificationPurpose purpose
) {
}
