package com.sos.backend.global.common.response;

import lombok.Getter;

@Getter
public class ApiResponse<T> {

    private final String message;
    private final T data;

    private ApiResponse(String message, T data) {
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("success", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(message, data);
    }

    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(message, null);
    }
}
