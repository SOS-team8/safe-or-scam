package com.sos.backend.domain.stat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.sos.backend.global.common.json.FlexibleUtcDateTimeDeserializer;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Schema(description = "게임 완료 동기화 요청 (game-engine >> backend)")
public record GameCompletedRequest(

    @Schema(description = "게임 완료 멱등성 키 (game-engine 발급 UUID)")
    @NotBlank
    @JsonProperty("play_log_id")
    String playLogId,

    @Schema(description = "사용자 ID", example = "1")
    @NotNull
    @JsonProperty("user_id")
    Long userId,

    @Schema(description = "시나리오 ID")
    @NotBlank
    @JsonProperty("scenario_id")
    String scenarioId,

    @Schema(description = "게임 세션 ID")
    @JsonProperty("session_id")
    String sessionId,

    @Schema(description = "결말 타입", example = "ending_good")
    @NotBlank
    @JsonProperty("ending_type")
    String endingType,

    @Schema(description = "도달한 결말 노드 ID", example = "n_end_good")
    @JsonProperty("final_node_id")
    String finalNodeId,

    @Schema(description = "이 시나리오의 수집도(0.0~1.0). game-engine 이 MongoDB 기준으로 계산해 전달 "
        + "— 업적(FULL_COLLECTION) 평가에 사용. backend 는 진행도를 적재하지 않음.",
        example = "1.0")
    @JsonProperty("completion_rate")
    Float completionRate,

    @Schema(description = "최종 점수")
    @JsonProperty("total_score")
    Integer totalScore,

    @Schema(description = "이번 판 위험 선택 수")
    @JsonProperty("dangerous_count")
    Integer dangerousCount,

    @Schema(description = "플레이 시간(초)")
    @JsonProperty("duration_seconds")
    Integer durationSeconds,

    @Schema(description = "완료 시각 (ISO-8601, 오프셋/Z 포함 가능 — UTC 로 정규화 저장)",
        example = "2026-06-05T05:40:58Z")
    @JsonProperty("completed_at")
    @JsonDeserialize(using = FlexibleUtcDateTimeDeserializer.class)
    LocalDateTime completedAt
) {
    public int totalScoreOrZero() {
        return totalScore != null ? totalScore : 0;
    }

    public int dangerousCountOrZero() {
        return dangerousCount != null ? dangerousCount : 0;
    }

    public float completionRateOrZero() {
        return completionRate != null ? completionRate : 0f;
    }
}
