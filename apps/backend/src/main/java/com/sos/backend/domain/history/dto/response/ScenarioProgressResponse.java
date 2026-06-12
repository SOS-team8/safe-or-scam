package com.sos.backend.domain.history.dto.response;

import com.sos.backend.global.internal.dto.ScenarioProgressInternalResponse;

import java.time.LocalDateTime;

public record ScenarioProgressResponse(
    String scenarioId,
    double completionRate,
    int discoveredCategoryCount,
    int totalCategories,
    LocalDateTime lastPlayedAt
) {
    public static ScenarioProgressResponse from(ScenarioProgressInternalResponse internal) {
        return new ScenarioProgressResponse(
            internal.scenarioId(),
            internal.completionRate(),
            internal.discoveredCategoryCount(),
            internal.totalCategories(),
            internal.lastPlayedAt()
        );
    }
}
