package com.sos.backend.domain.user.repository;

import com.sos.backend.domain.user.entity.WithdrawalOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface WithdrawalOutboxRepository extends JpaRepository<WithdrawalOutbox, Long> {

    Optional<WithdrawalOutbox> findByUserId(Long userId);

    @Query(value = """
        SELECT *
        FROM withdrawal_outbox wo
        WHERE wo.status = 'PENDING'
          AND wo.execute_at <= :now
        ORDER BY wo.withdrawal_outbox_id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<WithdrawalOutbox> lockNextDue(@Param("now") LocalDateTime now);

}
