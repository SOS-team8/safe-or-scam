package com.sos.backend.domain.user.enums;

import java.util.Arrays;

public enum CommunicateChannel {
    PHONE("phone"),
    SMS("sms"),
    MESSENGER("messenger"),
    SNS("sns"),
    EMAIL("email"),
    COMMUNITY("community"),
    NONE("none");

    private final String code;

    CommunicateChannel(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static CommunicateChannel fromCode(String code) {
        return Arrays.stream(values())
            .filter(value -> value.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid CommunicateChannel code: " + code));
    }
}
