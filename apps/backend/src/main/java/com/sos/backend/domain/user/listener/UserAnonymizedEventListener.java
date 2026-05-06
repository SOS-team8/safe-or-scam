package com.sos.backend.domain.user.listener;

import com.sos.backend.domain.auth.service.EmailVerificationService;
import com.sos.backend.domain.user.event.UserAnonymizedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserAnonymizedEventListener {

    private final EmailVerificationService emailVerificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserAnonymized(UserAnonymizedEvent event) {
        try {
            emailVerificationService.deleteVerificationKeysByEmail(event.originalEmail());
        } catch (Exception e) {
            log.warn("탈퇴 사용자 Redis 인증 키 삭제 실패", e);
        }
    }
}
