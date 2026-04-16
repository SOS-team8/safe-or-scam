package com.sos.backend.domain.common.enums;

import java.util.Arrays;

public enum EconomicActivity {
    EMPLOYEE("employee"),
    SELF_EMPLOYED("self_employed"),
    SIDE_JOB("side_job"),
    INVESTMENT("investment"),
    ONLINE_SHOPPING("online_shopping"),
    JOB_SEEKING("job_seeking"),
    STUDENT("student"),
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
