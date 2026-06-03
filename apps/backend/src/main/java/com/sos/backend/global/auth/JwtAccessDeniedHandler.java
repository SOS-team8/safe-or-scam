package com.sos.backend.global.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sos.backend.global.common.exception.ErrorCode;
import com.sos.backend.global.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException {

        ErrorCode errorCode = ErrorCode.FORBIDDEN;

        response.setStatus(errorCode.getStatus().value());
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        objectMapper.writeValue(response.getWriter(), ApiResponse.error(errorCode));
    }
}
