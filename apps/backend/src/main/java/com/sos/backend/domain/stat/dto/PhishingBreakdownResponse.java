package com.sos.backend.domain.stat.dto;

import com.sos.backend.global.internal.dto.PhishingBreakdownInternalResponse;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "사기 유형별 강약점 집계 항목")
public record PhishingBreakdownResponse(
    @Schema(description = "사기 유형", example = "smishing")
    String phishingType,

    @Schema(description = "해당 유형 완료 플레이 수", example = "5")
    int playCount,

    @Schema(description = "안전(good) 결말 수", example = "3")
    int goodCount,

    @Schema(description = "판당 평균 위험 선택 수", example = "1.4")
    double avgDangerous,

    @Schema(description = "평균 점수", example = "62.5")
    double avgScore
) {
    public static PhishingBreakdownResponse from(PhishingBreakdownInternalResponse internal) {
        return new PhishingBreakdownResponse(
            internal.phishingType(),
            internal.playCount(),
            internal.goodCount(),
            internal.avgDangerous(),
            internal.avgScore()
        );
    }
}
