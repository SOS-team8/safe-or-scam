package com.sos.backend.domain.history.dto.response;

import com.sos.backend.global.internal.dto.PlayLogSummaryInternalResponse;

import java.time.LocalDateTime;

public record PlayLogSummaryResponse(
    String logId,
    String endingType,
    int totalScore,
    int dangerousCount,
    int durationSeconds,
    LocalDateTime completedAt
) {
    public static PlayLogSummaryResponse from(PlayLogSummaryInternalResponse internal) {
        return new PlayLogSummaryResponse(
            internal.logId(),
            internal.endingType(),
            internal.totalScore(),
            internal.dangerousCount(),
            internal.durationSeconds(),
            internal.completedAt()
        );
    }
}
