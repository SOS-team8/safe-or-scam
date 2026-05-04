package com.sos.backend.domain.auth.service;

import com.sos.backend.domain.auth.EmailVerificationProperties;
import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.global.auth.VerificationTokenProvider;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import com.sos.backend.global.mail.EmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final String KEY_PREFIX_CODE = "email-verification:code:";
    private static final String KEY_PREFIX_COOLDOWN = "email-verification:cooldown:";
    private static final String KEY_PREFIX_DAILY = "email-verification:daily:";

    private static final String FIELD_CODE = "code";
    private static final String FIELD_ATTEMPT_COUNT = "attemptCount";

    private final StringRedisTemplate redis;
    private final EmailSender emailSender;
    private final EmailVerificationProperties properties;
    private final VerificationTokenProvider verificationTokenProvider;

    public void send(String email, VerificationPurpose purpose) {
        String codeKey = buildCodeKey(email,purpose);
        String cooldownKey = buildCooldownKey(email, purpose);
        String dailyKey = buildDailyKey(email, purpose);

        // 1. cooldown 검증
        Boolean cooldownExists = redis.hasKey(cooldownKey);
        if (Boolean.TRUE.equals(cooldownExists)) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_COOLDOWN);
        }

        // 2. daily limit 검증 — 24h 내 발송 횟수가 한도 이상이면 거부
        String dailyCountStr = redis.opsForValue().get(dailyKey);
        long dailyCount = (dailyCountStr == null) ? 0 : Long.parseLong(dailyCountStr);
        if (dailyCount >= properties.dailyLimit()) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_DAILY_LIMIT);
        }

        // 3. 새 코드 생성
        String code = generateCode();

        // 4. 인증 코드 저장 (rotate — 기존 삭제 후 새로 저장)
        redis.delete(codeKey);
        redis.opsForHash().put(codeKey, FIELD_CODE, code);
        redis.opsForHash().put(codeKey, FIELD_ATTEMPT_COUNT, "0");
        redis.expire(codeKey, Duration.ofSeconds(properties.expiresInSeconds()));

        // 5. cooldown 설정
        redis.opsForValue().set(
            cooldownKey,
            "1", // 의미 없는 값.
            Duration.ofSeconds(properties.cooldownSeconds())
        );

        // 6. daily counter 증가 (첫 호출이면 TTL 함께 설정)
        Long newDailyCount = redis.opsForValue().increment(dailyKey);
        if (newDailyCount != null && newDailyCount == 1L) {
            redis.expire(dailyKey, Duration.ofHours(24));
        }

        // 7. 메일 발송
        emailSender.sendVerificationCode(email, code);
    }

    @Transactional
    public String verify(String email, String inputCode, VerificationPurpose purpose) {
        String codeKey = buildCodeKey(email, purpose);

        // 1. 인증 코드 조회 (만료 됐는지 체크 효과)
        Map<Object, Object> entries = redis.opsForHash().entries(codeKey);
        if (entries.isEmpty()) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_CODE_INVALID);
        }

        String storedCode = (String) entries.get(FIELD_CODE);
        String attemptCountStr = (String) entries.get(FIELD_ATTEMPT_COUNT);
        int attemptCount = Integer.parseInt(attemptCountStr);

        // 2. 시도 횟수 초과
        if (attemptCount >= properties.maxAttempts()) {
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED);
        }

        // 3. 코드 매칭
        if (!storedCode.equals(inputCode)) {
            redis.opsForHash().increment(codeKey, FIELD_ATTEMPT_COUNT, 1);
            throw new CustomException(ErrorCode.EMAIL_VERIFICATION_CODE_INVALID);
        }

        // 4. 검증 성공 — key 삭제 + verification_token 발급
        redis.delete(codeKey);
        return verificationTokenProvider.createToken(email, purpose);
    }

    private String generateCode() {
        int max = (int) Math.pow(10, properties.codeLength());
        int code = RANDOM.nextInt(max);
        return String.format("%0" + properties.codeLength() + "d", code);
    }

    private String buildCodeKey(String email, VerificationPurpose purpose) {
        return KEY_PREFIX_CODE + purpose.name() + ":" + email;
    }

    private String buildCooldownKey(String email, VerificationPurpose purpose) {
        return KEY_PREFIX_COOLDOWN + purpose.name() + ":" + email;
    }

    private String buildDailyKey(String email, VerificationPurpose purpose) {
        return KEY_PREFIX_DAILY + purpose.name() + ":" + email;
    }
}
