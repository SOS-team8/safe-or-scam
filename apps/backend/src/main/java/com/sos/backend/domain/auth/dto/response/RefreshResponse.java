package com.sos.backend.domain.auth.dto.response;

public record RefreshResponse(
    String accessToken,
    String refreshToken
) {
}
