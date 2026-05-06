package com.sos.backend.domain.user.controller;

import com.sos.backend.domain.user.dto.OnboardingRequest;
import com.sos.backend.domain.user.dto.OnboardingResponse;
import com.sos.backend.domain.user.dto.UserActionResponse;
import com.sos.backend.domain.user.dto.UserInfoResponse;
import com.sos.backend.domain.user.dto.UserUpdateRequest;
import com.sos.backend.domain.user.dto.WithdrawalResponse;
import com.sos.backend.domain.user.service.UserService;
import com.sos.backend.domain.user.service.UserWithdrawalService;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me")
@Tag(name = "User", description = "내 정보 조회/수정 및 온보딩 API")
public class UserController {

    private final UserService userService;
    private final UserWithdrawalService userWithdrawalService;

    @GetMapping
    @Operation(summary = "내 정보 조회", description = "현재 사용자(임시: X-User-Id)의 기본 정보를 조회합니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "유저 또는 프로필을 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    public ApiResponse<UserInfoResponse> getMyInfo(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(userService.getMyInfo(userId));
    }

    @PatchMapping
    @Operation(summary = "내 정보 수정", description = "직업, 성별, 연령대를 수정합니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "잘못된 입력값",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "유저 또는 프로필을 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    public ApiResponse<UserActionResponse> updateMyInfo(
        @AuthenticationPrincipal Long userId,
        @Valid @RequestBody UserUpdateRequest request
    ) {
        return ApiResponse.success(userService.updateMyInfo(userId, request));
    }

    @PostMapping("/onboarding")
    @Operation(
        summary = "온보딩 완료",
        description = "온보딩 설문을 저장하고 사용자 권한을 GUEST에서 USER로 승격한 뒤, 변경된 권한이 반영된 JWT 토큰을 재발급합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "온보딩 완료")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "잘못된 입력값 또는 이미 USER 권한인 사용자",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "유저 또는 프로필을 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    public ApiResponse<OnboardingResponse> onboard(
        @AuthenticationPrincipal Long userId,
        @Valid @RequestBody OnboardingRequest request
    ) {
        return ApiResponse.success(userService.onboard(userId, request));
    }

    @PostMapping("/withdrawal")
    @Operation(
        summary = "회원 탈퇴 요청",
        description = "계정을 즉시 WITHDRAWAL_PENDING 상태로 전환하고 모든 Refresh Token을 revoke합니다. 최종 익명화/정리는 14일 후 스케줄러가 처리합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "탈퇴 요청 접수")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "이미 탈퇴 진행 중이거나 탈퇴된 사용자",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "유저를 찾을 수 없음",
        content = @Content(schema = @Schema(implementation = ApiResponse.class)))
    public ApiResponse<WithdrawalResponse> requestWithdrawal(
        @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.success(userWithdrawalService.requestWithdrawal(userId));
    }
}
