package com.sos.backend.domain.user.enums;

import java.util.Arrays;

public enum OnlineActivity {
    USED_TRADE("used_trade"),
    ONLINE_SHOPPING("online_shopping"),
    DELIVERY("delivery"),
    GOVERNMENT("government"),
    OVERSEAS_SHOPPING("overseas_shopping"),
    NONE("none");

    private final String code;

    OnlineActivity(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static OnlineActivity fromCode(String code) {
        return Arrays.stream(values())
            .filter(value -> value.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid OnlineActivity code: " + code));
    }
}
