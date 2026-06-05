package com.sos.backend.domain.stat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sos.backend.domain.achievement.dto.UnlockedAchievementResponse;
import com.sos.backend.domain.achievement.entity.Achievement;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "게임 완료 동기화 응답")
public record GameCompletedResponse(
    @Schema(description = "이번 완료로 새로 달성한 업적 목록")
    @JsonProperty("unlocked_achievements")
    List<UnlockedAchievementResponse> unlockedAchievements
) {
    public static GameCompletedResponse from(List<Achievement> achievements) {
        return new GameCompletedResponse(
            achievements.stream().map(UnlockedAchievementResponse::from).toList()
        );
    }
}
