package com.sos.backend.domain.auth.service;

import com.sos.backend.domain.auth.entity.RefreshToken;
import com.sos.backend.domain.auth.repository.RefreshTokenRepository;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.global.auth.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Refresh Token 발급 + DB 저장.
     * JWT(평문) 반환 → 클라이언트에 전달.
     * DB에는 SHA-256 해시로 저장.
     */
    @Transactional
    public String issue(User user) {
        String refreshToken = jwtProvider.createRefreshToken(user.getId(), user.getEmail());
        String tokenHash = sha256(refreshToken);

        RefreshToken entity = RefreshToken.builder()
            .user(user)
            .tokenHash(tokenHash)
            .expiredAt(jwtProvider.extractExpiry(refreshToken))
            .build();

        refreshTokenRepository.save(entity);

        return refreshToken;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 알고리즘 사용 불가", e);
        }
    }
}
