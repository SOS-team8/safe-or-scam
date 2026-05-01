package com.sos.backend.domain.auth.repository;

import com.sos.backend.domain.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
}
