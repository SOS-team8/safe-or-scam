package com.sos.backend.domain.user.enums;

import java.util.Arrays;

public enum FinancialChannel {
    MOBILE_BANKING("mobile_banking"),
    ATM("atm"),
    INTERNET_BANKING("internet_banking"),
    EASY_PAY("easy_pay"),
    CRYPTO("crypto"),
    OVERSEAS_REMIT("overseas_remit"),
    NONE("none");

    private final String code;

    FinancialChannel(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static FinancialChannel fromCode(String code) {
        return Arrays.stream(values())
            .filter(value -> value.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid FinancialChannel code: " + code));
    }
}
