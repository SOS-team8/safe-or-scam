package com.sos.backend.domain.auth.service;

import com.sos.backend.domain.auth.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailVerificationAttemptService {

    private final EmailVerificationRepository repository;

    /**
     * attemptCount를 별도 트랜잭션(REQUIRES_NEW)에서 증가.
     * verify 메서드에서 예외가 던져져 메인 트랜잭션이 롤백되어도,
     * 이 증가는 별도 트랜잭션이라 commit되어 보존됨.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void incrementAttemptCount(Long codeId) {
        repository.findById(codeId).ifPresent(row ->
            row.setAttemptCount(row.getAttemptCount() + 1)
        );
    }
}
