package com.sos.backend.global.auth;

import com.sos.backend.domain.user.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public JwtProvider(JwtProperties jwtProperties) {
        this.secretKey = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = jwtProperties.accessTokenExpiration();
        this.refreshTokenExpiration = jwtProperties.refreshTokenExpiration();
    }

    // Access Token 생성
    public String createAccessToken(Long userId, String email) {
        return createToken(userId, email, null, accessTokenExpiration);
    }

    public String createAccessToken(Long userId, String email, Role role) {
        return createToken(userId, email, role, accessTokenExpiration);
    }

    // Refresh Token 생성
    public String createRefreshToken(Long userId, String email) {
        return createToken(userId, email, null, refreshTokenExpiration);
    }

    // 토큰 생성
    //
    // jti (JWT ID, RFC 7519 §4.1.7) — 매 호출마다 고유 UUID.
    // - refresh token rotation 시 동일 ms 내 재발급되어도 tokenHash 충돌 없음
    //   (refresh_tokens.token_hash UNIQUE 제약 만족)
    // - access token에는 logically 불필요하지만, 정책 단순화 위해 동일하게 부여
    private String createToken(Long userId, String email, Role role, long expiration) {
        var builder = Jwts.builder()
            .id(UUID.randomUUID().toString())
            .subject(String.valueOf(userId))
            .claim("email", email)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(secretKey, Jwts.SIG.HS256);

        if (role != null) {
            builder.claim("role", role.name());
        }

        return builder.compact();
    }

    // 토큰에서 userId 추출
    public Long getUserId(String token) {
        return Long.parseLong(getClaims(token).getSubject());
    }

    // 토큰에서 email 추출
    public String getEmail(String token) {
        return getClaims(token).get("email", String.class);
    }

    // 토큰의 만료 시각 추출
    public LocalDateTime extractExpiry(String token) {
        Date expiration = getClaims(token).getExpiration();
        return expiration.toInstant()
            .atZone(ZoneId.systemDefault())
            .toLocalDateTime();
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // 토큰 유효성 검증하고, 실패 시 만료/위조 구분된 CustomException throw
    public void validateOrThrow(String token) {
        try {
            getClaims(token);
        } catch (ExpiredJwtException e) {
            throw new CustomException(ErrorCode.EXPIRED_TOKEN);
        } catch (JwtException | IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }

    // Claims 추출
    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
