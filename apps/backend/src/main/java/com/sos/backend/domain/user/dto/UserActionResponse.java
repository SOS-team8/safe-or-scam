package com.sos.backend.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "내 정보 수정 완료 응답")
public record UserActionResponse(
    @Schema(description = "처리 결과 메시지", example = "내 정보가 수정되었습니다.")
    String message
) {
    public static UserActionResponse of(String message) {
        return new UserActionResponse(message);
    }
}
