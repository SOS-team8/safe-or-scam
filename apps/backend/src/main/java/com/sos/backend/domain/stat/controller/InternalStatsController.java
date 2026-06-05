package com.sos.backend.domain.stat.controller;

import com.sos.backend.domain.stat.dto.GameCompletedRequest;
import com.sos.backend.domain.stat.dto.GameCompletedResponse;
import com.sos.backend.domain.stat.service.StatsSyncService;
import com.sos.backend.global.common.config.InternalApiProperties;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * 서버 간 내부 호출 전용. 사용자 JWT 가 아닌 X-Internal-Api-Key 헤더로 인증한다.
 * (SecurityConfig 에서 /api/v1/internal/** 는 permitAll, 여기서 키를 직접 검증)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/internal")
@Tag(name = "Internal", description = "서버 간 동기화 API (game-engine 전용)")
public class InternalStatsController {

    private final StatsSyncService statsSyncService;
    private final InternalApiProperties internalApiProperties;

    @PostMapping("/stats/game-completed")
    @Operation(summary = "게임 완료 동기화",
        description = "game-engine 이 결말 도달 시 호출. 통계/진행도 갱신, 업적 평가·부여, 업적 알림 생성 후 새로 달성한 업적을 반환합니다. play_log_id 로 멱등 처리됩니다.")
    public ApiResponse<GameCompletedResponse> gameCompleted(
        @RequestHeader(value = "X-Internal-Api-Key", required = false) String apiKey,
        @Valid @RequestBody GameCompletedRequest request
    ) {
        verifyApiKey(apiKey);
        return ApiResponse.success(statsSyncService.handleGameCompleted(request));
    }

    private void verifyApiKey(String provided) {
        if (provided == null) {
            throw new CustomException(ErrorCode.INVALID_INTERNAL_API_KEY);
        }
        byte[] expected = internalApiProperties.apiKey().getBytes(StandardCharsets.UTF_8);
        byte[] given = provided.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, given)) {
            throw new CustomException(ErrorCode.INVALID_INTERNAL_API_KEY);
        }
    }
}
