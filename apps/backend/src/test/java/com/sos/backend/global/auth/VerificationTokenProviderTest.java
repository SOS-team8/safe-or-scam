package com.sos.backend.global.auth;

import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VerificationTokenProviderTest {

    private static final String SECRET = "test-secret-key-must-be-at-least-32-bytes-long-for-hs256";
    private static final long EXPIRES_IN_SECONDS = 300L;
    private static final String EMAIL = "test@example.com";

    private VerificationTokenProvider provider;

    @BeforeEach
    void setUp() {
        VerificationTokenProperties properties = new VerificationTokenProperties(SECRET, EXPIRES_IN_SECONDS);
        provider = new VerificationTokenProvider(properties);
    }

    @Nested
    @DisplayName("토큰 발급 및 정상 검증")
    class CreateAndValidate {

        @Test
        @DisplayName("발급한 토큰을 같은 purpose로 검증하면 email을 반환한다")
        void createAndValidate_success() {
            String token = provider.createToken(EMAIL, VerificationPurpose.SIGNUP);

            String result = provider.validateAndGetEmail(token, VerificationPurpose.SIGNUP);

            assertThat(result).isEqualTo(EMAIL);
        }

        @Test
        @DisplayName("PASSWORD_RESET 용도로 발급한 토큰도 같은 purpose로 검증 가능하다")
        void createAndValidate_passwordReset() {
            String token = provider.createToken(EMAIL, VerificationPurpose.RESET_PASSWORD);

            String result = provider.validateAndGetEmail(token, VerificationPurpose.RESET_PASSWORD);

            assertThat(result).isEqualTo(EMAIL);
        }
    }

    @Nested
    @DisplayName("토큰 검증 실패 케이스")
    class ValidationFailure {

        @Test
        @DisplayName("SIGNUP 토큰을 PASSWORD_RESET으로 검증하면 INVALID_TOKEN 예외를 던진다")
        void purposeMismatch() {
            String token = provider.createToken(EMAIL, VerificationPurpose.SIGNUP);

            assertThatThrownBy(() -> provider.validateAndGetEmail(token, VerificationPurpose.RESET_PASSWORD))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_TOKEN);
        }

        @Test
        @DisplayName("만료된 토큰은 EXPIRED_TOKEN 예외를 던진다")
        void expiredToken() {
            // 음수 만료시간으로 즉시 만료된 토큰 생성 (record 검증은 Spring binding 시점에만 동작)
            VerificationTokenProperties expiredProperties = new VerificationTokenProperties(SECRET, -10L);
            VerificationTokenProvider expiredProvider = new VerificationTokenProvider(expiredProperties);
            String expiredToken = expiredProvider.createToken(EMAIL, VerificationPurpose.SIGNUP);

            assertThatThrownBy(() -> provider.validateAndGetEmail(expiredToken, VerificationPurpose.SIGNUP))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.EXPIRED_TOKEN);
        }

        @Test
        @DisplayName("다른 secret으로 서명된 토큰은 INVALID_TOKEN 예외를 던진다")
        void tamperedSignature() {
            // 다른 secret으로 직접 토큰 발급
            SecretKey wrongKey = Keys.hmacShaKeyFor(
                "different-secret-key-also-32-bytes-long-for-hs256!!".getBytes(StandardCharsets.UTF_8)
            );
            String tamperedToken = Jwts.builder()
                .subject(EMAIL)
                .claim("purpose", VerificationPurpose.SIGNUP.name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 300_000L))
                .signWith(wrongKey)
                .compact();

            assertThatThrownBy(() -> provider.validateAndGetEmail(tamperedToken, VerificationPurpose.SIGNUP))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_TOKEN);
        }

        @Test
        @DisplayName("형식이 잘못된 문자열은 INVALID_TOKEN 예외를 던진다")
        void malformedToken() {
            String malformed = "this-is-not-a-jwt";

            assertThatThrownBy(() -> provider.validateAndGetEmail(malformed, VerificationPurpose.SIGNUP))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_TOKEN);
        }
    }
}
