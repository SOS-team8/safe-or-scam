package com.sos.backend.domain.history.controller;

import com.sos.backend.domain.history.dto.response.PlayLogDetailResponse;
import com.sos.backend.domain.history.dto.response.PlayLogSummaryResponse;
import com.sos.backend.domain.history.dto.response.ScenarioProgressResponse;
import com.sos.backend.domain.history.service.HistoryService;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me/history")
@RequiredArgsConstructor
@Tag(name = "History", description = "플레이 기록 관련 API")
public class HistoryController {

    private final HistoryService historyService;

    @Operation(summary = "결말 수집 진행도 목록 조회",
        description = "사용자가 1개 이상 결말에 도달한 시나리오들의 진행도 목록을 조회한다. Game Engine internal API 호출.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "진행도 목록 조회 성공"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "Access Token 무효/만료/미첨부 (UNAUTHORIZED / INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502",
            description = "Game Engine 호출 실패 (INTERNAL_API_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @GetMapping("/progress")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<List<ScenarioProgressResponse>> getScenarioProgress(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(historyService.getScenarioProgress(userId));
    }

    @Operation(summary = "시나리오별 플레이 기록 목록 조회",
        description = "특정 시나리오에서 사용자가 완료한 플레이 기록 목록을 조회한다. Game Engine internal API 호출.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "플레이 기록 목록 조회 성공"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "Access Token 무효/만료/미첨부 (UNAUTHORIZED / INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502",
            description = "Game Engine 호출 실패 (INTERNAL_API_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @GetMapping("/play-logs")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<List<PlayLogSummaryResponse>> getPlayLogs(
        @AuthenticationPrincipal Long userId,
        @RequestParam String scenarioId
    ) {
        return ApiResponse.success(historyService.getPlayLogs(userId, scenarioId));
    }

    @Operation(summary = "플레이 기록 상세(결말) 조회",
        description = "플레이 기록의 결말 상세(사진 + 결말 요약 텍스트 + 카테고리)를 조회한다. Game Engine internal API 호출.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "플레이 기록 상세 조회 성공"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "Access Token 무효/만료/미첨부 (UNAUTHORIZED / INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404",
            description = "플레이 기록 없음 또는 타인 소유 (PLAY_LOG_NOT_FOUND)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502",
            description = "Game Engine 호출 실패 (INTERNAL_API_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @GetMapping("/play-logs/{logId}")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<PlayLogDetailResponse> getPlayLogDetail(
        @AuthenticationPrincipal Long userId,
        @PathVariable String logId
    ) {
        return ApiResponse.success(historyService.getPlayLogDetail(logId, userId));
    }
}
