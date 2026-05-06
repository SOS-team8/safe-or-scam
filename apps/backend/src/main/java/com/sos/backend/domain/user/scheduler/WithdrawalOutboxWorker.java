package com.sos.backend.domain.user.scheduler;

import com.sos.backend.domain.user.entity.WithdrawalOutbox;
import com.sos.backend.domain.user.repository.WithdrawalOutboxRepository;
import com.sos.backend.domain.user.service.UserWithdrawalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class WithdrawalOutboxWorker {

    private final WithdrawalOutboxRepository withdrawalOutboxRepository;
    private final UserWithdrawalService userWithdrawalService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean processOneDue() {
        WithdrawalOutbox outbox = withdrawalOutboxRepository.lockNextDue(LocalDateTime.now())
            .orElse(null);

        if (outbox == null) {
            return false;
        }

        try {
            userWithdrawalService.finalizeScheduledWithdrawal(outbox);
        } catch (Exception e) {
            log.error("탈퇴 outbox 처리 실패 - outboxId: {}, userId: {}", outbox.getId(), outbox.getUserId(), e);
            outbox.markFailed(LocalDateTime.now(), trimError(e.getMessage()));
        }
        return true;
    }

    private String trimError(String message) {
        if (message == null) {
            return "unknown error";
        }
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }
}
