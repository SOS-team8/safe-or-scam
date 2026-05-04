package com.sos.backend.domain.user.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EconomicActivityTest {

    @Test
    @DisplayName("현재 코드값은 정상 역매핑된다")
    void fromCode_currentValues() {
        assertThat(EconomicActivity.fromCode("entertainment")).isEqualTo(EconomicActivity.ENTERTAINMENT);
        assertThat(EconomicActivity.fromCode("travel")).isEqualTo(EconomicActivity.TRAVEL);
        assertThat(EconomicActivity.fromCode("subscription")).isEqualTo(EconomicActivity.SUBSCRIPTION);
        assertThat(EconomicActivity.fromCode("education")).isEqualTo(EconomicActivity.EDUCATION);
        assertThat(EconomicActivity.fromCode("online_shopping")).isEqualTo(EconomicActivity.ONLINE_SHOPPING);
        assertThat(EconomicActivity.fromCode("investment")).isEqualTo(EconomicActivity.INVESTMENT);
    }

    @Test
    @DisplayName("알 수 없는 값은 예외를 던진다")
    void fromCode_invalid() {
        assertThatThrownBy(() -> EconomicActivity.fromCode("invalid_code"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
