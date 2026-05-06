package com.sos.backend.domain.user.service;

import com.sos.backend.domain.auth.repository.AuthProviderRepository;
import com.sos.backend.domain.auth.service.RefreshTokenService;
import com.sos.backend.domain.game_session.repository.GameSessionRepository;
import com.sos.backend.domain.notification.repository.NotificationRepository;
import com.sos.backend.domain.scenario_progress.repository.UserScenarioProgressRepository;
import com.sos.backend.domain.user.WithdrawalProperties;
import com.sos.backend.domain.user.dto.WithdrawalResponse;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.WithdrawalOutbox;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserProfileRepository;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.domain.user.repository.WithdrawalOutboxRepository;
import com.sos.backend.domain.user.event.UserAnonymizedEvent;
import com.sos.backend.domain.user.event.UserStatusCacheInvalidateEvent;
import com.sos.backend.global.auth.UserStatusCacheService;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserWithdrawalService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuthProviderRepository authProviderRepository;
    private final NotificationRepository notificationRepository;
    private final GameSessionRepository gameSessionRepository;
    private final UserScenarioProgressRepository userScenarioProgressRepository;
    private final WithdrawalOutboxRepository withdrawalOutboxRepository;
    private final RefreshTokenService refreshTokenService;
    private final UserStatusCacheService userStatusCacheService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final WithdrawalProperties withdrawalProperties;

    @Transactional
    public WithdrawalResponse requestWithdrawal(Long userId) {
        User user = getUser(userId);

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        user.requestWithdrawal();
        refreshTokenService.revokeAllByUserId(userId);

        LocalDateTime executeAt = LocalDateTime.now().plusDays(withdrawalProperties.pendingDays());
        try {
            withdrawalOutboxRepository.save(WithdrawalOutbox.schedule(userId, executeAt));
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        userStatusCacheService.cacheStatus(userId, UserStatus.WITHDRAWAL_PENDING);
        applicationEventPublisher.publishEvent(new UserStatusCacheInvalidateEvent(userId));
        return WithdrawalResponse.of(executeAt, user.getStatus());
    }

    @Transactional
    public void finalizePendingUserForResignup(User user) {
        if (user.getStatus() != UserStatus.WITHDRAWAL_PENDING) {
            return;
        }
        anonymizeAndCleanup(user, LocalDateTime.now());
        withdrawalOutboxRepository.findByUserId(user.getId())
            .ifPresent(outbox -> outbox.markDone(LocalDateTime.now()));
    }

    @Transactional
    public void finalizeScheduledWithdrawal(WithdrawalOutbox outbox) {
        User user = userRepository.findById(outbox.getUserId())
            .orElse(null);

        if (user == null) {
            outbox.markDone(LocalDateTime.now());
            return;
        }

        if (user.getStatus() == UserStatus.WITHDRAWN) {
            outbox.markDone(LocalDateTime.now());
            return;
        }

        if (user.getStatus() != UserStatus.WITHDRAWAL_PENDING) {
            log.warn("탈퇴 outbox 처리 건 스킵 - userId: {}, status: {}", user.getId(), user.getStatus());
            outbox.markDone(LocalDateTime.now());
            return;
        }

        anonymizeAndCleanup(user, LocalDateTime.now());
        outbox.markDone(LocalDateTime.now());
    }

    private void anonymizeAndCleanup(User user, LocalDateTime now) {
        String originalEmail = user.getEmail();

        userProfileRepository.deleteByUserId(user.getId());
        authProviderRepository.deleteAllByUserId(user.getId());
        notificationRepository.deleteAllByUserId(user.getId());
        gameSessionRepository.deleteAllByUserId(user.getId());
        userScenarioProgressRepository.deleteAllByUserId(user.getId());
        refreshTokenService.revokeAllByUserId(user.getId());

        // TODO: game-engine(Mongo) cleanup 엔드포인트 연동은 추후 작업에서 추가한다.
        user.completeWithdrawal(now);
        userStatusCacheService.invalidate(user.getId());

        applicationEventPublisher.publishEvent(new UserAnonymizedEvent(originalEmail));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
