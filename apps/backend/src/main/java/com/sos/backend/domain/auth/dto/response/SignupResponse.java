package com.sos.backend.domain.auth.dto.response;

import com.sos.backend.domain.user.enums.Role;

public record SignupResponse(
    String accessToken,
    String refreshToken,
    UserInfo user
) {
    public record UserInfo(
        Long userId,
        String email,
        String name,
        Role role
    ) {
    }
}
