package com.sos.backend.global.auth;

import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class VerificationTokenProvider {

    private final SecretKey secretKey;
    private final long expirationMillis;

    public VerificationTokenProvider(VerificationTokenProperties properties) {
        this.secretKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = properties.expiresInSeconds() * 1000L;
    }

    /**
     * 이메일 인증 완료 후 signup/password reset에 사용할 단기 토큰 발급.
     * @param email 인증 완료된 이메일
     * @param purpose 토큰 용도(SIGNUP / PASSWORD_RESET)
     */
    public String createToken(String email, VerificationPurpose purpose) {
        return Jwts.builder()
            .subject(email)
            .claim("purpose", purpose.name())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMillis))
            .signWith(secretKey)
            .compact();
    }

    /**
     * 토큰 검증 후 인증된 이메일 반환.
     * 토큰의 purpose가 expectedPurpose와 일치해야 함.
     *
     * @param token verification token (JWT)
     * @param expectedPurpose 호출 측이 기대하는 용도
     * @return 인증된 이메일
     * @throws CustomException 토큰 만료 / 변조 / purpose 불일치 시
     */
    public String validateAndGetEmail(String token, VerificationPurpose expectedPurpose) {
        Claims claims = parseClaims(token);

        String purposeClaim = claims.get("purpose", String.class);
        if (purposeClaim == null || !purposeClaim.equals(expectedPurpose.name())) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        return claims.getSubject();
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            throw new CustomException(ErrorCode.EXPIRED_TOKEN);
        } catch (JwtException | IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
    }
}
