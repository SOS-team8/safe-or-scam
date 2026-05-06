package com.sos.backend.domain.user.scheduler;

import com.sos.backend.domain.user.WithdrawalProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WithdrawalOutboxScheduler {

    private final WithdrawalOutboxWorker withdrawalOutboxWorker;
    private final WithdrawalProperties withdrawalProperties;

    @Scheduled(fixedDelayString = "${withdrawal.scheduler-fixed-delay-ms}")
    public void processDueWithdrawals() {
        for (int i = 0; i < withdrawalProperties.schedulerBatchSize(); i++) {
            boolean processed = withdrawalOutboxWorker.processOneDue();
            if (!processed) {
                return;
            }
        }

        log.info("탈퇴 outbox 배치 처리 한도 도달 - batchSize: {}", withdrawalProperties.schedulerBatchSize());
    }
}
