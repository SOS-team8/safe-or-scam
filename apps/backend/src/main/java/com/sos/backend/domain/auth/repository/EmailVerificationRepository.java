package com.sos.backend.domain.auth.repository;

import com.sos.backend.domain.auth.entity.EmailVerification;
import com.sos.backend.domain.auth.enums.VerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByEmailAndPurpose(String email, VerificationPurpose purpose);

    Optional<EmailVerification> findTopByEmailAndPurposeOrderByCreatedAtDesc(
        String email,
        VerificationPurpose purpose
    );

    long countByEmailAndPurposeAndCreatedAtAfter(
        String email,
        VerificationPurpose purpose,
        LocalDateTime threshold
    );

    void deleteByEmailAndPurpose(String email, VerificationPurpose purpose);
}
