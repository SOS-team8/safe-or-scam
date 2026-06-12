package com.sos.backend.global.internal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.sos.backend.global.common.json.FlexibleUtcDateTimeDeserializer;

import java.time.LocalDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ScenarioProgressInternalResponse(
    String scenarioId,
    double completionRate,
    int discoveredCategoryCount,
    int totalCategories,
    @JsonDeserialize(using = FlexibleUtcDateTimeDeserializer.class)
    LocalDateTime lastPlayedAt
) {
}
