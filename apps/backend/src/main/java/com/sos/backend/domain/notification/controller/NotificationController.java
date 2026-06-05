package com.sos.backend.domain.notification.controller;

import com.sos.backend.domain.notification.dto.NotificationResponse;
import com.sos.backend.domain.notification.service.NotificationService;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notification", description = "알림 조회/읽음/삭제 API")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "알림 목록 조회", description = "사용자의 알림 목록을 최신순으로 반환합니다.")
    public ApiResponse<List<NotificationResponse>> getNotifications(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(notificationService.list(userId));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "알림 읽음 처리")
    public ApiResponse<Void> markRead(
        @AuthenticationPrincipal Long userId,
        @PathVariable Long notificationId
    ) {
        notificationService.markRead(userId, notificationId);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{notificationId}")
    @Operation(summary = "알림 개별 삭제")
    public ApiResponse<Void> deleteOne(
        @AuthenticationPrincipal Long userId,
        @PathVariable Long notificationId
    ) {
        notificationService.deleteOne(userId, notificationId);
        return ApiResponse.success(null);
    }

    @DeleteMapping
    @Operation(summary = "알림 전체 삭제")
    public ApiResponse<Void> deleteAll(
        @AuthenticationPrincipal Long userId
    ) {
        notificationService.deleteAll(userId);
        return ApiResponse.success(null);
    }
}
