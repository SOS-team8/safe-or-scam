package com.sos.backend.global.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sos.backend.global.common.exception.ErrorCode;
import com.sos.backend.global.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    // JwtFilter가 토큰 실패 사유를 담는 키 (같은 패키지라 필터가 그대로 참조)
    public static final String AUTH_ERROR_ATTRIBUTE = "authError";

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {

        Object stashed = request.getAttribute(AUTH_ERROR_ATTRIBUTE);
        ErrorCode errorCode = (stashed instanceof ErrorCode ec) ? ec : ErrorCode.UNAUTHORIZED;

        response.setStatus(errorCode.getStatus().value());
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        objectMapper.writeValue(response.getWriter(), ApiResponse.error(errorCode));
    }
}
