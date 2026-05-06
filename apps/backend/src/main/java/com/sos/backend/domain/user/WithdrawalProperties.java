package com.sos.backend.domain.user;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "withdrawal")
@Validated
public record WithdrawalProperties(
    @Min(1) int pendingDays,
    @Positive long schedulerFixedDelayMs,
    @Positive int schedulerBatchSize
) {
}
