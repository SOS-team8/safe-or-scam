package com.sos.backend.global.internal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ScenarioProgressInternalResponse(
    String scenarioId,
    double completionRate,
    int discoveredCount,
    int totalEndings,
    String lastPlayedAt
) {
}
