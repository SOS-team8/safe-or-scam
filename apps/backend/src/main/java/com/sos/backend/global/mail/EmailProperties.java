package com.sos.backend.global.mail;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "mail.sender")
@Validated
public record EmailProperties(
    @NotBlank String from,
    @NotBlank String senderName
) {
}
