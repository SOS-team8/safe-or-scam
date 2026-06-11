package com.sos.backend.global.internal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.sos.backend.global.common.json.FlexibleUtcDateTimeDeserializer;

import java.time.LocalDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlayLogSummaryInternalResponse(
    String logId,
    String endingType,
    int totalScore,
    int dangerousCount,
    int durationSeconds,
    @JsonDeserialize(using = FlexibleUtcDateTimeDeserializer.class)
    LocalDateTime completedAt
) {
}
