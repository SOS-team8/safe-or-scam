package com.sos.backend.domain.common.enums;

import java.util.Arrays;

public enum FamilyType {
    WITH_PARENTS("with_parents"),
    WITH_PARTNER("with_partner"),
    WITH_CHILDREN("with_children"),
    ALONE("alone"),
    OTHER("other");

    private final String code;

    FamilyType(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static FamilyType fromCode(String code) {
        return Arrays.stream(values())
            .filter(value -> value.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid FamilyType code: " + code));
    }
}
