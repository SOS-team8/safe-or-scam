package com.sos.backend.domain.achievement.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sos.backend.domain.achievement.entity.Achievement;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "업적 목록 항목 (보유/미보유)")
public record AchievementResponse(
    @Schema(description = "업적 ID", example = "1")
    @JsonProperty("achievement_id")
    Long achievementId,

    @Schema(description = "업적 코드", example = "FIRST_CLEAR")
    String code,

    @Schema(description = "업적 제목", example = "첫 클리어 완료")
    String title,

    @Schema(description = "업적 설명")
    String description,

    @Schema(description = "배지 이미지 URL")
    @JsonProperty("icon_url")
    String iconUrl,

    @Schema(description = "달성 여부", example = "true")
    boolean unlocked,

    @Schema(description = "달성 시각 (미달성이면 null)")
    @JsonProperty("achieved_at")
    LocalDateTime achievedAt,

    @Schema(description = "누적 진행 수치. 누적 N/M 이 불가한 업적(FLAWLESS·FULL_COLLECTION)은 null", example = "3")
    @JsonProperty("progress_current")
    Integer progressCurrent,

    @Schema(description = "달성 임계값. 누적 N/M 이 불가한 업적은 null", example = "5")
    @JsonProperty("progress_target")
    Integer progressTarget
) {
    public static AchievementResponse of(
        Achievement a, LocalDateTime achievedAt, Integer progressCurrent, Integer progressTarget
    ) {
        return new AchievementResponse(
            a.getAchievementId(), a.getCode(), a.getTitle(), a.getDescription(), a.getIconUrl(),
            achievedAt != null, achievedAt, progressCurrent, progressTarget
        );
    }
}
