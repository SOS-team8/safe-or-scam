package com.sos.backend.global.internal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlayLogDetailInternalResponse(
    String logId,
    String scenarioId,
    String imageUrl,
    String text,
    EndingCategory endingCategory
) {
    public record EndingCategory(String label, String description) {
    }
}
