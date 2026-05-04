package com.sos.backend.domain.auth.dto.response;

import com.sos.backend.domain.user.enums.Role;
import jakarta.validation.constraints.Email;

public record LoginResponse(
    String accessToken,
    String refreshToken,
    UserInfo user
) {
    public record UserInfo(
        Long id,
        String email,
        String name,
        Role role
    ) {}
}
