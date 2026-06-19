package com.sos.backend.domain.achievement.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sos.backend.domain.achievement.entity.Achievement;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "이번 완료로 새로 달성한 업적")
public record UnlockedAchievementResponse(
    @Schema(description = "업적 코드", example = "FULL_COLLECTION")
    String code,

    @Schema(description = "업적 제목", example = "결말 수집가")
    String title,

    @Schema(description = "업적 설명")
    String description,

    @Schema(description = "배지 이미지 URL")
    @JsonProperty("icon_url")
    String iconUrl
) {
    public static UnlockedAchievementResponse from(Achievement a) {
        return new UnlockedAchievementResponse(a.getCode(), a.getTitle(), a.getDescription(), a.getIconUrl());
    }
}
