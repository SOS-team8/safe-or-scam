package com.sos.backend.domain.email.repository;

import com.sos.backend.domain.email.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
}
