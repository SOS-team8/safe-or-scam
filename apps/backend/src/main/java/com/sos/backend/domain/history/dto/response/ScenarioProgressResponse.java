package com.sos.backend.domain.history.dto.response;

import com.sos.backend.global.internal.dto.ScenarioProgressInternalResponse;

public record ScenarioProgressResponse(
    String scenarioId,
    double completionRate,
    int discoveredCount,
    int totalEndings,
    String lastPlayedAt
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
