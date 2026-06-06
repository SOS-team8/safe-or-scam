package com.sos.backend.domain.history.dto.response;

import com.sos.backend.global.internal.dto.ScenarioProgressInternalResponse;

import java.time.LocalDateTime;

public record ScenarioProgressResponse(
    String scenarioId,
    double completionRate,
    int discoveredCount,
    int totalEndings,
    LocalDateTime lastPlayedAt
) {
    public static ScenarioProgressResponse from(ScenarioProgressInternalResponse internal) {
        return new ScenarioProgressResponse(
            internal.scenarioId(),
            internal.completionRate(),
            internal.discoveredCount(),
            internal.totalEndings(),
            internal.lastPlayedAt()
        );
    }
}
