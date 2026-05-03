package com.sos.backend.domain.auth.service;

import com.sos.backend.domain.auth.EmailVerificationProperties;
import com.sos.backend.domain.auth.entity.EmailVerification;
import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.domain.auth.repository.EmailVerificationRepository;
import com.sos.backend.global.auth.VerificationTokenProvider;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import com.sos.backend.global.mail.EmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();


    private final EmailVerificationRepository repository;
    private final EmailSender emailSender;
    private final EmailVerificationProperties properties;
    private final VerificationTokenProvider verificationTokenProvider;
    private final EmailVerificationAttemptService attemptService;

    @Transactional
    public void send(String email, VerificationPurpose purpose) {
        LocalDateTime now = LocalDateTime.now();

        // 1. cooldown 검증 — 가장 최근 row가 60초 이내면 거부
        repository.findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
            .ifPresent(latest -> {
                LocalDateTime cooldownThreshold = now.minusSeconds(properties.cooldownSeconds());
                if (latest.getCreatedAt().isAfter(cooldownThreshold)) {
                    throw new CustomException(ErrorCode.EMAIL_VERIFICATION_COOLDOWN);
                }
            });

        // 2. daily limit 검증 — 24h 내 발송 횟수가 한도 이상이면 거부
        LocalDateTime dailyThreshold = now.minusHours(24);
        long recentCount = repository.countByEmailAndPurposeAndCreatedAtAfter(email, purpose, dailyThreshold);
        if (recentCount >= properties.dailyLimit()) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_DAILY_LIMIT);
        }

        // 3. 기존 row 삭제 (rotate)
        repository.deleteByEmailAndPurpose(email, purpose);

        // 4. 새 코드 생성 + 저장
        String code = generateCode();
        EmailVerification verification = EmailVerification.builder()
            .email(email)
            .code(code)
            .purpose(purpose)
            .expiredAt(now.plusSeconds(properties.expiresInSeconds()))
            .build();
        repository.save(verification);

        // 5. 메일 발송
        emailSender.sendVerificationCode(email, code);
    }

    @Transactional
    public String verify(String email, String inputCode, VerificationPurpose purpose) {
        EmailVerification row = repository.findByEmailAndPurpose(email, purpose)
            .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_VERIFICATION_CODE_INVALID));

        // 시도횟수 초과
        if (row.getAttemptCount() >= properties.maxAttempts()) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED);
        }

        // 만료
        if (LocalDateTime.now().isAfter(row.getExpiredAt())) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_CODE_EXPIRED);
        }

        // 코드 불일치
        if (!row.getCode().equals(inputCode)) {
            attemptService.incrementAttemptCount(row.getCodeId());  // ← 별도 트랜잭션
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_CODE_INVALID);
        }

        // 검증 성공 — row 삭제 + verification_token 발급
        repository.delete(row);
        return verificationTokenProvider.createToken(email, purpose);
    }

    private String generateCode() {
        int max = (int) Math.pow(10, properties.codeLength());
        int code = RANDOM.nextInt(max);
        return String.format("%0" + properties.codeLength() + "d", code);
    }
}
