package com.sos.backend.global.auth;

import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.global.common.exception.CustomException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final UserStatusCacheService userStatusCacheService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
        throws ServletException, IOException {

        String token = resolveToken(request);

        if (token != null) {
            try {
                jwtProvider.validateOrThrow(token);

                Long userId = jwtProvider.getUserId(token);
                String email = jwtProvider.getEmail(token);
                UserStatus userStatus = userStatusCacheService.getStatus(userId);

                // 탈퇴/탈퇴대기 유저는 인증을 걸지 않음 (기존 동작 유지)
                if (userStatus != UserStatus.WITHDRAWAL_PENDING
                    && userStatus != UserStatus.WITHDRAWN) {
                    UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                            userId, email, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (CustomException e) {
                // 사유 stash → entry point가 읽어 ApiResponse 401 생성
                request.setAttribute(JwtAuthenticationEntryPoint.AUTH_ERROR_ATTRIBUTE, e.getErrorCode());
            }
        }

        filterChain.doFilter(request, response);
    }

    // Authorization 헤더에서 Bearer 토큰 추출
    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
