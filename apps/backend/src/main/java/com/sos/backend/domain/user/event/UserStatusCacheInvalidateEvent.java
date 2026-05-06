package com.sos.backend.domain.user.event;

public record UserStatusCacheInvalidateEvent(
    Long userId
) {
}
