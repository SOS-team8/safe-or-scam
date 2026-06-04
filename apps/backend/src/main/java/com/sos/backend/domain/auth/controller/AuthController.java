package com.sos.backend.domain.auth.controller;

import com.sos.backend.domain.auth.dto.request.*;
import com.sos.backend.domain.auth.dto.response.EmailVerifyResponse;
import com.sos.backend.domain.auth.dto.response.LoginResponse;
import com.sos.backend.domain.auth.dto.response.RefreshResponse;
import com.sos.backend.domain.auth.dto.response.SignupResponse;
import com.sos.backend.domain.auth.service.AuthService;
import com.sos.backend.domain.auth.service.EmailVerificationService;
import com.sos.backend.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "인증 관련 API (이메일 인증, 회원가입, 로그인, 토큰 관리)")
public class AuthController {

    private final EmailVerificationService emailVerificationService;
    private final AuthService authService;

    @Operation(summary = "이메일 인증 코드 전송", description = "email과 purpose(SIGNUP/PASSWORD_RESET)를 받아 6자리 인증 코드를 메일로 발송한다.")
    @PostMapping("/email/send")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody EmailSendRequest request) {
        emailVerificationService.send(request.email(), request.purpose());
        return ApiResponse.success(null);
    }

    @Operation(summary = "이메일 인증 코드 검증", description = "인증 코드를 검증하고, 성공 시 단기 verification_token(5분 유효)을 발급한다.")
    @PostMapping("/email/verify")
    public ApiResponse<EmailVerifyResponse> verifyEmailCode(@Valid @RequestBody EmailVerifyRequest request) {
        String verificationToken = emailVerificationService.verify(request.email(), request.code(), request.purpose());
        return ApiResponse.success(new EmailVerifyResponse(verificationToken));
    }

    @Operation(summary = "자체 회원가입", description = "email, password, name, verification_token으로 회원가입을 처리한다.")
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return ApiResponse.success(response);
    }

    @Operation(summary = "자체 로그인", description = "email, password로 로그인하고 Access Token과 Refresh Token을 발급한다.")
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.success(response);
    }

    @Operation(summary = "토큰 갱신", description = "Refresh Token으로 새 Access Token을 발급한다. Refresh Token Rotation이 적용된다.")
    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        RefreshResponse response = authService.refresh(request);
        return ApiResponse.success(response);
    }

    @Operation(summary = "로그아웃", description = "현재 기기의 Refresh Token을 폐기한다(revoked=true). Access Token은 만료까지 유효.")
    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<Void> logout(
        @Valid @RequestBody LogoutRequest request,
        @AuthenticationPrincipal Long userId
    ) {
        authService.logout(request, userId);
        return ApiResponse.success(null);
    }

    @Operation(summary = "전체 로그아웃", description = "해당 사용자의 모든 Refresh Token을 폐기한다.")
    @PostMapping("/logout/all")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<Void> logoutAll(@AuthenticationPrincipal Long userId) {
        authService.logoutAll(userId);
        return ApiResponse.success(null);
    }
}
