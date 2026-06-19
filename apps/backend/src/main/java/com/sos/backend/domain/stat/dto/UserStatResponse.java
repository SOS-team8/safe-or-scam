package com.sos.backend.domain.stat.dto;

import com.sos.backend.domain.user.entity.UserStat;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 사용자 누적 통계 응답 (GET /api/v1/users/me/stats).
 * camelCase 직렬화 (전역 snake_case 설정 없음 — history DTO 와 동일 규약).
 */
@Schema(description = "사용자 누적 통계")
public record UserStatResponse(
    @Schema(description = "전체 플레이 수 (미완료 포함)", example = "42")
    int totalPlays,

    @Schema(description = "완료한 플레이 수", example = "40")
    int completePlays,

    @Schema(description = "안전 결말 도달 수", example = "24")
    int goodEndings,

    @Schema(description = "주의 결말 도달 수", example = "16")
    int badEndings,

    @Schema(description = "누적 위험 선택 수", example = "156")
    int totalDangerousChoices,

    @Schema(description = "평균 점수", example = "78.5")
    double avgScore,

    @Schema(description = "최고 점수", example = "95")
    int bestScore
) {
    public static UserStatResponse from(UserStat stat) {
        return new UserStatResponse(
            stat.getTotalPlays(),
            stat.getCompletePlays(),
            stat.getGoodEndings(),
            stat.getBadEndings(),
            stat.getTotalDangerousChoices(),
            stat.getAvgScore().doubleValue(),
            stat.getBestScore()
        );
    }

    /** 통계 행이 아직 없는(게임 미완료) 사용자용 0 통계. */
    public static UserStatResponse empty() {
        return new UserStatResponse(0, 0, 0, 0, 0, 0.0, 0);
    }
}
