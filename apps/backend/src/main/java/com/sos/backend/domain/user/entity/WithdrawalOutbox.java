package com.sos.backend.domain.user.entity;

import com.sos.backend.domain.user.enums.WithdrawalOutboxStatus;
import com.sos.backend.global.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "withdrawal_outbox",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_withdrawal_outbox_user_id", columnNames = "user_id")
    },
    indexes = {
        @Index(name = "idx_withdrawal_outbox_status_execute_at", columnList = "status,execute_at")
    }
)
public class WithdrawalOutbox extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "withdrawal_outbox_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "execute_at", nullable = false)
    private LocalDateTime executeAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WithdrawalOutboxStatus status;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    public static WithdrawalOutbox schedule(Long userId, LocalDateTime executeAt) {
        return WithdrawalOutbox.builder()
            .userId(userId)
            .executeAt(executeAt)
            .status(WithdrawalOutboxStatus.PENDING)
            .build();
    }

    public void markDone(LocalDateTime now) {
        this.status = WithdrawalOutboxStatus.DONE;
        this.processedAt = now;
        this.lastError = null;
    }

    public void markFailed(LocalDateTime now, String errorMessage) {
        this.status = WithdrawalOutboxStatus.FAILED;
        this.processedAt = now;
        this.lastError = errorMessage;
    }
}
