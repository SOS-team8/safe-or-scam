package com.sos.backend.domain.auth.service;

import com.sos.backend.domain.auth.PasswordProperties;
import com.sos.backend.domain.auth.dto.request.LoginRequest;
import com.sos.backend.domain.auth.dto.request.SignupRequest;
import com.sos.backend.domain.auth.dto.response.LoginResponse;
import com.sos.backend.domain.auth.dto.response.SignupResponse;
import com.sos.backend.domain.auth.entity.AuthProvider;
import com.sos.backend.domain.auth.enums.Provider;
import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.domain.auth.repository.AuthProviderRepository;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.global.auth.JwtProvider;
import com.sos.backend.global.auth.VerificationTokenProvider;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final VerificationTokenProvider verificationTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final PasswordProperties passwordProperties;
    private final UserRepository userRepository;
    private final AuthProviderRepository authProviderRepository;
    private final JwtProvider jwtProvider;
    private final RefreshTokenService refreshTokenService;

    private String dummyHash;

    @PostConstruct
    private void initDummyHash() {
        this.dummyHash = passwordEncoder.encode("dummy");
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        // 1. verification_token 검증 + email 추출
        String email = verificationTokenProvider.validateAndGetEmail(
            request.verificationToken(),
            VerificationPurpose.SIGNUP
        );

        // 2. 비밀번호 길이 검증
        validatePasswordLength(request.password());

        // 3. 이메일 중복 검증
        if (userRepository.existsByEmail(email)) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        // 4. User 생성 + 저장
        String hashedPassword = passwordEncoder.encode(request.password());
        User user = User.builder()
            .email(email)
            .password(hashedPassword)
            .name(request.name())
            .role(Role.USER)
            .status(UserStatus.ACTIVE)
            .lastLoginAt(LocalDateTime.now())
            .build();
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        // 5. AuthProvider(LOCAL) 생성 + 저장
        AuthProvider authProvider = AuthProvider.builder()
            .user(user)
            .provider(Provider.LOCAL)
            // providerId는 LOCAL이면 null (엔티티 @PrePersist 검증)
            .build();
        authProviderRepository.save(authProvider);

        // 6. Access/Refresh Token 발급 (자동 로그인)
        String accessToken = jwtProvider.createAccessToken(user.getId(), user.getEmail());
        String refreshToken = refreshTokenService.issue(user);

        // 7. 응답 구성
        return new SignupResponse(
            accessToken,
            refreshToken,
            new SignupResponse.UserInfo(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
            )
        );
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        // 1. 이메일로 user 조회
        Optional<User> userOpt = userRepository.findByEmail(request.email());

        // 2. user 없으면 더미 해시로 BCrypt 비교 후 실패 (timing attack 방어)
        if (userOpt.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        User user = userOpt.get();

        // 3. 비밀번호 비교
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        // 4. 계정 상태 검증 (ACTIVE만 로그인 허용)
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        // 5. lastLoginAt 갱신
        user.setLastLoginAt(LocalDateTime.now());

        // 6. Access/Refresh Token 발급
        String accessToken = jwtProvider.createAccessToken(user.getId(), user.getEmail());
        String refreshToken = refreshTokenService.issue(user);

        // 7. 응답 구성
        return new LoginResponse(
            accessToken,
            refreshToken,
            new LoginResponse.UserInfo(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
            )
        );
    }

    private void validatePasswordLength(String password) {
        int byteLength = password.getBytes(StandardCharsets.UTF_8).length;
        int charLength = password.length();

        // 최소 길이는 문자 수 기준 (UX 일관성)
        if (charLength < passwordProperties.minLength()) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD_LENGTH);
        }

        // 최대 길이는 byte 기준 (BCrypt 한계)
        if (byteLength > passwordProperties.maxLength()) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD_LENGTH);
        }
    }
}
