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
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "인증 코드 발송 성공"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "요청 검증 실패 (VALIDATION_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429",
            description = "재발송 쿨다운(EMAIL_VERIFICATION_COOLDOWN) / 일일 한도 초과(EMAIL_VERIFICATION_DAILY_LIMIT)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @PostMapping("/email/send")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody EmailSendRequest request) {
        emailVerificationService.send(request.email(), request.purpose());
        return ApiResponse.success(null);
    }

    @Operation(summary = "이메일 인증 코드 검증", description = "인증 코드를 검증하고, 성공 시 단기 verification_token(5분 유효)을 발급한다.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "인증 성공, verification_token 발급"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "요청 검증 실패(VALIDATION_ERROR) / 코드 불일치·만료(EMAIL_VERIFICATION_CODE_INVALID) / 시도 초과(EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @PostMapping("/email/verify")
    public ApiResponse<EmailVerifyResponse> verifyEmailCode(@Valid @RequestBody EmailVerifyRequest request) {
        String verificationToken = emailVerificationService.verify(request.email(), request.code(), request.purpose());
        return ApiResponse.success(new EmailVerifyResponse(verificationToken));
    }

    @Operation(summary = "자체 회원가입", description = "email, password, name, verification_token으로 회원가입을 처리한다.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "회원가입 성공 (자동 로그인 토큰 발급)"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "요청 검증 실패(VALIDATION_ERROR) / 비밀번호 길이 위반(INVALID_PASSWORD_LENGTH)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class),
                examples = @ExampleObject(name = "VALIDATION_ERROR", value = """
                {"error":{"code":"VALIDATION_ERROR","message":"입력값이 올바르지 않습니다","fieldInfo":[{"field":"email","message":"올바른 이메일 형식이 아닙니다"}]},"meta":{"timestamp":"2026-06-04T12:00:00"}}"""))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "verification_token 무효/만료/purpose 불일치 (INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409",
            description = "이미 사용 중인 이메일 (EMAIL_ALREADY_EXISTS)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return ApiResponse.success(response);
    }

    @Operation(summary = "자체 로그인", description = "email, password로 로그인하고 Access Token과 Refresh Token을 발급한다.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "로그인 성공 (Access/Refresh Token 발급)"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "요청 검증 실패 (VALIDATION_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "이메일/비밀번호 불일치 또는 비활성 계정 (INVALID_CREDENTIALS) — 보안상 사유 미구분",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class),
                examples = @ExampleObject(name = "INVALID_CREDENTIALS", value = """
                {"error":{"code":"INVALID_CREDENTIALS","message":"이메일 또는 비밀번호가 올바르지 않습니다"},"meta":{"timestamp":"2026-06-04T12:00:00"}}""")))
    })
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.success(response);
    }

    @Operation(summary = "토큰 갱신", description = "Refresh Token으로 새 Access Token을 발급한다. Refresh Token Rotation이 적용된다.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "토큰 갱신 성공 (Rotation 적용)"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "요청 검증 실패 (VALIDATION_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "Refresh Token 무효/만료/재사용 감지 (INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class),
                examples = {
                    @ExampleObject(name = "EXPIRED_TOKEN", value = """
                    {"error":{"code":"EXPIRED_TOKEN","message":"만료된 토큰입니다"},"meta":{"timestamp":"2026-06-04T12:00:00"}}"""),
                    @ExampleObject(name = "INVALID_TOKEN", value = """
                    {"error":{"code":"INVALID_TOKEN","message":"유효하지 않은 토큰입니다"},"meta":{"timestamp":"2026-06-04T12:00:00"}}""")
                })),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404",
            description = "토큰의 사용자를 찾을 수 없음 (USER_NOT_FOUND)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        RefreshResponse response = authService.refresh(request);
        return ApiResponse.success(response);
    }

    @Operation(summary = "로그아웃", description = "현재 기기의 Refresh Token을 폐기한다(revoked=true). Access Token은 만료까지 유효.")
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "로그아웃 성공 (현재 기기 Refresh Token 폐기)"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "요청 검증 실패 (VALIDATION_ERROR)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "Access Token 무효/만료/미첨부 (UNAUTHORIZED / INVALID_TOKEN / EXPIRED_TOKEN) 또는 본문 Refresh Token 무효 (INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class),
                examples = {
                    @ExampleObject(name = "UNAUTHORIZED (토큰 미첨부)", value = """
                    {"error":{"code":"UNAUTHORIZED","message":"인증이 필요합니다"},"meta":{"timestamp":"2026-06-04T12:00:00"}}"""),
                    @ExampleObject(name = "EXPIRED_TOKEN", value = """
                    {"error":{"code":"EXPIRED_TOKEN","message":"만료된 토큰입니다"},"meta":{"timestamp":"2026-06-04T12:00:00"}}""")
                }))
    })
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
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "전체 로그아웃 성공 (모든 Refresh Token 폐기)"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
            description = "Access Token 무효/만료/미첨부 (UNAUTHORIZED / INVALID_TOKEN / EXPIRED_TOKEN)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiResponse.class)))
    })
    @PostMapping("/logout/all")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<Void> logoutAll(@AuthenticationPrincipal Long userId) {
        authService.logoutAll(userId);
        return ApiResponse.success(null);
    }
}
