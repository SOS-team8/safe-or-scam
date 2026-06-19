package com.sos.backend.domain.user.dto;

import com.sos.backend.domain.user.enums.UserStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "회원 탈퇴 요청 응답")
public record WithdrawalResponse(
    @Schema(description = "처리 결과 메시지", example = "회원 탈퇴가 접수되었습니다.")
    String message,

    @Schema(description = "최종 익명화 예정 시각", example = "2026-05-20T10:30:00")
    LocalDateTime scheduledAt,

    @Schema(description = "현재 계정 상태", example = "WITHDRAWAL_PENDING")
    UserStatus status
) {

    public static WithdrawalResponse of(LocalDateTime scheduledAt, UserStatus status) {
        return new WithdrawalResponse("회원 탈퇴가 접수되었습니다.", scheduledAt, status);
    }
}
