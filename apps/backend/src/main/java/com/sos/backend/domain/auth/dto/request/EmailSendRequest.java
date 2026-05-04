package com.sos.backend.domain.auth.dto.request;

import com.sos.backend.domain.auth.enums.VerificationPurpose;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EmailSendRequest(
    @NotBlank
    @Email
    String email,

    @NotNull
    VerificationPurpose purpose
) {
}
