package com.sos.backend.global.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sos.backend.global.common.exception.ErrorCode;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final T data;
    private final ErrorInfo error;
    private final Meta meta;

    private ApiResponse(T data, ErrorInfo message) {
        this.data = data;
        this.error = message;
        this.meta = new Meta(LocalDateTime.now());
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data, null);
    }

    public static ApiResponse<Void> error(ErrorCode errorCode) {
        return new ApiResponse<>(null, new ErrorInfo(errorCode.name(), errorCode.getMessage(), null));
    }

    public static ApiResponse<Void> validationError(List<FieldError> details) {
        return new ApiResponse<>(null, new ErrorInfo("VALIDATION_ERROR", "입력값이 올바르지 않습니다", details));
    }

    @Getter
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorInfo {
        private final String code;
        private final String message;
        private final List<FieldError> fieldInfo;

        public ErrorInfo(String code, String message, List<FieldError> details) {
            this.code = code;
            this.message = message;
            this.fieldInfo = details;
        }
    }

    @Getter
    public static class FieldError {
        private final String field;
        private final String message;

        public FieldError(String field, String message) {
            this.field = field;
            this.message = message;
        }
    }

    @Getter
    public static class Meta {
        private final LocalDateTime timestamp;

        public Meta(LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }
    }
}
