package com.sos.backend.domain.user.entity;

import com.sos.backend.domain.user.enums.WithdrawalOutboxStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class WithdrawalOutboxTest {

    @Test
    @DisplayName("처리 실패 시 상태를 FAILED로 전환하고 processedAt을 기록한다")
    void markFailed_changesStatusToFailed() {
        WithdrawalOutbox outbox = WithdrawalOutbox.schedule(1L, LocalDateTime.now().plusDays(14));
        LocalDateTime now = LocalDateTime.now();

        outbox.markFailed(now, "boom");

        assertThat(outbox.getStatus()).isEqualTo(WithdrawalOutboxStatus.FAILED);
        assertThat(outbox.getProcessedAt()).isEqualTo(now);
        assertThat(outbox.getLastError()).isEqualTo("boom");
    }
}
