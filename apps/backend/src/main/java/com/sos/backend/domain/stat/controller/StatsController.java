package com.sos.backend.domain.stat.controller;

import com.sos.backend.domain.stat.dto.PhishingBreakdownResponse;
import com.sos.backend.domain.stat.dto.UserStatResponse;
import com.sos.backend.domain.stat.service.StatsService;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me/stats")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Stats", description = "사용자 통계 조회 API")
public class StatsController {

    private final StatsService statsService;

    @GetMapping
    @Operation(summary = "내 통계 조회",
        description = "완료 플레이/안전·주의 결말/평균·최고 점수 등 누적 통계를 반환. 통계가 없으면 0 통계.")
    public ApiResponse<UserStatResponse> getMyStats(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(statsService.getMyStats(userId));
    }

    @GetMapping("/phishing-breakdown")
    @Operation(summary = "사기 유형별 강약점 조회",
        description = "play_logs 를 phishing_type 으로 그룹한 유형별 플레이수·안전 결말수·평균 위험선택·평균 점수. 플레이 기록이 없으면 빈 목록.")
    public ApiResponse<List<PhishingBreakdownResponse>> getPhishingBreakdown(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(statsService.getPhishingBreakdown(userId));
    }
}
