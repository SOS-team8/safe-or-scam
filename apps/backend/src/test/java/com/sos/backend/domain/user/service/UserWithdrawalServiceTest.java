package com.sos.backend.domain.user.service;

import com.sos.backend.domain.auth.repository.AuthProviderRepository;
import com.sos.backend.domain.auth.service.RefreshTokenService;
import com.sos.backend.domain.notification.repository.NotificationRepository;
import com.sos.backend.domain.user.WithdrawalProperties;
import com.sos.backend.domain.user.dto.WithdrawalResponse;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.WithdrawalOutbox;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.enums.WithdrawalOutboxStatus;
import com.sos.backend.domain.user.event.UserAnonymizedEvent;
import com.sos.backend.domain.user.event.UserStatusCacheInvalidateEvent;
import com.sos.backend.domain.user.repository.UserProfileRepository;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.domain.user.repository.WithdrawalOutboxRepository;
import com.sos.backend.global.auth.UserStatusCacheService;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserWithdrawalServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserProfileRepository userProfileRepository;
    @Mock
    private AuthProviderRepository authProviderRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private WithdrawalOutboxRepository withdrawalOutboxRepository;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private UserStatusCacheService userStatusCacheService;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    private UserWithdrawalService userWithdrawalService;

    @BeforeEach
    void setUp() {
        WithdrawalProperties properties = new WithdrawalProperties(14, 30_000L, 20);
        userWithdrawalService = new UserWithdrawalService(
            userRepository,
            userProfileRepository,
            authProviderRepository,
            notificationRepository,
            withdrawalOutboxRepository,
            refreshTokenService,
            userStatusCacheService,
            applicationEventPublisher,
            properties
        );
    }

    @Nested
    @DisplayName("회원 탈퇴 요청")
    class RequestWithdrawal {

        @Test
        @DisplayName("ACTIVE 사용자는 WITHDRAWAL_PENDING으로 전환되고 outbox가 생성된다")
        void requestWithdrawal_success() {
            Long userId = 1L;
            User user = createUser(userId, "user@sos.com", UserStatus.ACTIVE);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            WithdrawalResponse response = userWithdrawalService.requestWithdrawal(userId);

            assertThat(response.status()).isEqualTo(UserStatus.WITHDRAWAL_PENDING);
            assertThat(user.getStatus()).isEqualTo(UserStatus.WITHDRAWAL_PENDING);

            ArgumentCaptor<WithdrawalOutbox> outboxCaptor = ArgumentCaptor.forClass(WithdrawalOutbox.class);
            verify(withdrawalOutboxRepository).save(outboxCaptor.capture());
            assertThat(outboxCaptor.getValue().getUserId()).isEqualTo(userId);

            verify(refreshTokenService).revokeAllByUserId(userId);
            verify(userStatusCacheService).cacheStatus(userId, UserStatus.WITHDRAWAL_PENDING);
            verify(applicationEventPublisher).publishEvent(any(UserStatusCacheInvalidateEvent.class));
        }

        @Test
        @DisplayName("이미 WITHDRAWAL_PENDING이면 INVALID_INPUT 예외를 던진다")
        void requestWithdrawal_pendingUser() {
            Long userId = 1L;
            User user = createUser(userId, "user@sos.com", UserStatus.WITHDRAWAL_PENDING);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> userWithdrawalService.requestWithdrawal(userId))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        }
    }

    @Test
    @DisplayName("재가입 시 PENDING 사용자를 즉시 익명화한다")
    void finalizePendingUserForResignup_success() {
        Long userId = 3L;
        User user = createUser(userId, "pending@sos.com", UserStatus.WITHDRAWAL_PENDING);
        WithdrawalOutbox outbox = WithdrawalOutbox.schedule(userId, LocalDateTime.now().plusDays(14));

        when(withdrawalOutboxRepository.findByUserId(userId)).thenReturn(Optional.of(outbox));

        userWithdrawalService.finalizePendingUserForResignup(user);
        assertThat(outbox.getStatus()).isEqualTo(WithdrawalOutboxStatus.DONE);
        assertThat(outbox.getProcessedAt()).isNotNull();

        assertThat(user.getStatus()).isEqualTo(UserStatus.WITHDRAWN);
        assertThat(user.getEmail()).isEqualTo("withdrawn-3@anonymized.local");
        assertThat(user.getPassword()).isNull();
        assertThat(user.getName()).isEqualTo("탈퇴한 사용자");

        verify(userProfileRepository).deleteByUserId(userId);
        verify(authProviderRepository).deleteAllByUserId(userId);
        verify(notificationRepository).deleteAllByUserId(userId);
        verify(refreshTokenService).revokeAllByUserId(userId);
        verify(userStatusCacheService).invalidate(userId);
        verify(applicationEventPublisher).publishEvent(any(UserAnonymizedEvent.class));
    }

    private User createUser(Long id, String email, UserStatus status) {
        return User.builder()
            .id(id)
            .email(email)
            .password("encoded")
            .name("테스트")
            .role(Role.USER)
            .status(status)
            .build();
    }
}
