package com.sos.backend.domain.auth;

import com.sos.backend.domain.auth.dto.request.RefreshRequest;
import com.sos.backend.domain.auth.dto.response.RefreshResponse;
import com.sos.backend.domain.auth.service.AuthService;
import com.sos.backend.domain.auth.service.RefreshTokenService;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.global.common.AbstractIntegrationTest;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AuthService.refresh() role claim 유지 검증 (P1-4 + auth-boundary.md §5).
 *
 * 검증 포인트:
 *  - refresh 후 새 access token에 role claim이 포함
 *  - role 값은 DB의 현재 user.getRole()을 반영 (기존 토큰의 role 복사가 아님)
 *  - subject(sub)는 user id 문자열 표현
 *
 * Testcontainers PostgreSQL이 필요. Docker 없는 환경에서는 무시.
 */
@DisplayName("AuthService.refresh role claim 유지 (P1-4)")
class RefreshRoleClaimTest extends AbstractIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private UserRepository userRepository;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Test
    @DisplayName("refresh 후 새 access token에 USER role claim이 포함된다")
    void refresh_includesUserRoleClaim() {
        // given: USER role 사용자 + 발급된 refresh token
        User user = userRepository.save(User.builder()
            .email("refresh-role@example.com")
            .name("리프레시테스트")
            .role(Role.USER)
            .status(UserStatus.ACTIVE)
            .build());
        String refreshToken = refreshTokenService.issue(user);

        // when
        RefreshResponse response = authService.refresh(new RefreshRequest(refreshToken));

        // then
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(response.accessToken())
            .getPayload();

        assertThat(claims.get("role", String.class)).isEqualTo("USER");
        assertThat(claims.getSubject()).isEqualTo(String.valueOf(user.getId()));
    }

    @Test
    @DisplayName("refresh 후 GUEST role 사용자는 access token에 GUEST role claim이 유지된다")
    void refresh_preservesGuestRoleClaim() {
        // given: GUEST role 사용자
        User user = userRepository.save(User.builder()
            .email("refresh-guest@example.com")
            .name("게스트테스트")
            .role(Role.GUEST)
            .status(UserStatus.ACTIVE)
            .build());
        String refreshToken = refreshTokenService.issue(user);

        // when
        RefreshResponse response = authService.refresh(new RefreshRequest(refreshToken));

        // then
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(response.accessToken())
            .getPayload();

        assertThat(claims.get("role", String.class)).isEqualTo("GUEST");
    }
}
