package com.sos.backend.domain.auth.dto.response;

public record EmailVerifyResponse(
    String verificationToken
) {
}
