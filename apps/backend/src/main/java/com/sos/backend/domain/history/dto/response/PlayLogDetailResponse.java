package com.sos.backend.domain.history.dto.response;

import com.sos.backend.global.internal.dto.PlayLogDetailInternalResponse;

public record PlayLogDetailResponse(
    String logId,
    String scenarioId,
    String imageUrl,
    String text,
    EndingCategory endingCategory
) {
    public record EndingCategory(String label, String description) {
    }

    public static PlayLogDetailResponse from(PlayLogDetailInternalResponse internal) {
        EndingCategory category = internal.endingCategory() == null
            ? null
            : new EndingCategory(
            internal.endingCategory().label(),
            internal.endingCategory().description()
        );
        return new PlayLogDetailResponse(
            internal.logId(),
            internal.scenarioId(),
            internal.imageUrl(),
            internal.text(),
            category
        );
    }
}
