package com.sos.backend.global.internal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/**
 * game-engine GET /api/internal/stats/phishing-breakdown/{userId} 응답 항목.
 * game-engine 은 snake_case 로 직렬화 → SnakeCaseStrategy 로 매핑.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PhishingBreakdownInternalResponse(
    String phishingType,
    int playCount,
    int goodCount,
    double avgDangerous,
    double avgScore
) {
}
