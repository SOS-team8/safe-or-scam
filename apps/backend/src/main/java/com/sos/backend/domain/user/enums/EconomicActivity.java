package com.sos.backend.domain.user.enums;

import java.util.Arrays;

public enum EconomicActivity {
    ENTERTAINMENT("entertainment"),
    TRAVEL("travel"),
    SUBSCRIPTION("subscription"),
    EDUCATION("education"),
    ONLINE_SHOPPING("online_shopping"),
    INVESTMENT("investment"),
    NONE("none");

    private final String code;

    EconomicActivity(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static EconomicActivity fromCode(String code) {
        return Arrays.stream(values())
            .filter(value -> value.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid EconomicActivity code: " + code));
    }
}
