package com.sos.backend.domain.achievement.controller;

import com.sos.backend.domain.achievement.dto.AchievementResponse;
import com.sos.backend.domain.achievement.service.AchievementService;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me/achievements")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Achievement", description = "업적 조회 API")
public class AchievementController {

    private final AchievementService achievementService;

    @GetMapping
    @Operation(summary = "내 업적 목록 조회", description = "전체 업적을 보유/미보유 여부와 함께 반환.")
    public ApiResponse<List<AchievementResponse>> getMyAchievements(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(achievementService.getMyAchievements(userId));
    }
}
