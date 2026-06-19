package com.sos.backend.domain.auth.service;

import com.sos.backend.domain.auth.PasswordProperties;
import com.sos.backend.domain.auth.dto.request.SignupRequest;
import com.sos.backend.domain.auth.dto.response.SignupResponse;
import com.sos.backend.domain.auth.entity.AuthProvider;
import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.domain.auth.repository.AuthProviderRepository;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.domain.user.service.UserWithdrawalService;
import com.sos.backend.global.auth.JwtProvider;
import com.sos.backend.global.auth.VerificationTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private VerificationTokenProvider verificationTokenProvider;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuthProviderRepository authProviderRepository;
    @Mock
    private JwtProvider jwtProvider;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private UserWithdrawalService userWithdrawalService;

    @Test
    @DisplayName("회원가입 시 기존 PENDING 계정을 즉시 익명화하면 flush 후 신규 가입을 진행한다")
    void signup_flushesAfterFinalizingPendingUser() {
        PasswordProperties passwordProperties = new PasswordProperties(10, 72, 12);
        AuthService authService = new AuthService(
            verificationTokenProvider,
            passwordEncoder,
            passwordProperties,
            userRepository,
            authProviderRepository,
            jwtProvider,
            refreshTokenService,
            userWithdrawalService
        );

        String email = "resignup@sos.com";
        SignupRequest request = new SignupRequest("verification-token", "1234567890", "홍길동");
        User pendingUser = User.builder()
            .id(99L)
            .email(email)
            .name("기존유저")
            .role(Role.USER)
            .status(UserStatus.WITHDRAWAL_PENDING)
            .build();

        given(verificationTokenProvider.validateAndGetEmail("verification-token", VerificationPurpose.SIGNUP))
            .willReturn(email);
        given(userRepository.findByEmail(email)).willReturn(Optional.of(pendingUser));
        given(passwordEncoder.encode("1234567890")).willReturn("encoded-password");
        given(jwtProvider.createAccessToken(any(), anyString(), any())).willReturn("new-access-token");
        given(refreshTokenService.issue(any(User.class))).willReturn("new-refresh-token");
        given(authProviderRepository.save(any(AuthProvider.class))).willReturn(null);

        SignupResponse response = authService.signup(request);

        InOrder inOrder = inOrder(userWithdrawalService, userRepository);
        inOrder.verify(userWithdrawalService).finalizePendingUserForResignup(pendingUser);
        inOrder.verify(userRepository).flush();
        inOrder.verify(userRepository).save(any(User.class));

        assertThat(response.accessToken()).isEqualTo("new-access-token");
        assertThat(response.refreshToken()).isEqualTo("new-refresh-token");
        verify(authProviderRepository).save(any(AuthProvider.class));
    }
}
