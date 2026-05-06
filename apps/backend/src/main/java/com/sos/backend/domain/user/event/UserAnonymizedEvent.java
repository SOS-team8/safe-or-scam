package com.sos.backend.domain.user.event;

public record UserAnonymizedEvent(
    String originalEmail
) {
}
