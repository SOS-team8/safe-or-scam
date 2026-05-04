package com.sos.backend.domain.auth.controller;

import com.sos.backend.domain.auth.dto.request.EmailSendRequest;
import com.sos.backend.domain.auth.dto.request.EmailVerifyRequest;
import com.sos.backend.domain.auth.dto.request.LoginRequest;
import com.sos.backend.domain.auth.dto.request.SignupRequest;
import com.sos.backend.domain.auth.dto.response.EmailVerifyResponse;
import com.sos.backend.domain.auth.dto.response.LoginResponse;
import com.sos.backend.domain.auth.dto.response.SignupResponse;
import com.sos.backend.domain.auth.service.AuthService;
import com.sos.backend.domain.auth.service.EmailVerificationService;
import com.sos.backend.global.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final EmailVerificationService emailVerificationService;
    private final AuthService authService;

    @PostMapping("/email/send")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody EmailSendRequest request) {
        emailVerificationService.send(request.email(), request.purpose());
        return ApiResponse.success(null);
    }

    @PostMapping("/email/verify")
    public ApiResponse<EmailVerifyResponse> verifyEmailCode(@Valid @RequestBody EmailVerifyRequest request) {
        String verificationToken = emailVerificationService.verify(request.email(), request.code(), request.purpose());
        return ApiResponse.success(new EmailVerifyResponse(verificationToken));
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return ApiResponse.success(response);
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.success(response);
    }
}
