package com.sos.backend.global.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다"),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "유저를 찾을 수 없습니다"),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다"),

    // Auth
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다"),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다"),

    // Email Verification
    EMAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "이메일 발송에 실패했습니다"),
    EMAIL_VERIFICATION_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요"),
    EMAIL_VERIFICATION_DAILY_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "일일 인증 요청 한도를 초과했습니다"),
    EMAIL_VERIFICATION_CODE_INVALID(HttpStatus.BAD_REQUEST, "인증 코드가 일치하지 않습니다"),
    EMAIL_VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "인증 코드가 만료되었습니다"),
    EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED(HttpStatus.BAD_REQUEST, "인증 시도 횟수를 초과했습니다");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
