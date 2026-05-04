package com.sos.backend.domain.auth.controller;

import com.sos.backend.domain.auth.dto.EmailSendRequest;
import com.sos.backend.domain.auth.dto.EmailVerifyRequest;
import com.sos.backend.domain.auth.dto.EmailVerifyResponse;
import com.sos.backend.domain.auth.service.EmailVerificationService;
import com.sos.backend.global.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final EmailVerificationService emailVerificationService;

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

}
