package com.sos.backend.domain.user.dto;

import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "온보딩 완료 응답")
public record OnboardingResponse(
    @Schema(description = "처리 결과 메시지", example = "온보딩이 완료되었습니다.")
    String message,

    @Schema(description = "재발급된 Access Token", example = "eyJhbGciOiJIUzI1NiJ9...")
    String accessToken,

    @Schema(description = "재발급된 Refresh Token", example = "eyJhbGciOiJIUzI1NiJ9...")
    String refreshToken,

    @Schema(description = "온보딩 완료 후 사용자 역할", example = "USER")
    Role role
) {
    public static OnboardingResponse of(String message, String accessToken, String refreshToken, User user) {
        return new OnboardingResponse(message, accessToken, refreshToken, user.getRole());
    }
}
