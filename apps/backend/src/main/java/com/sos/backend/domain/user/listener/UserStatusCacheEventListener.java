package com.sos.backend.domain.user.listener;

import com.sos.backend.domain.user.event.UserStatusCacheInvalidateEvent;
import com.sos.backend.global.auth.UserStatusCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class UserStatusCacheEventListener {

    private final UserStatusCacheService userStatusCacheService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserStatusCacheInvalidate(UserStatusCacheInvalidateEvent event) {
        userStatusCacheService.invalidate(event.userId());
    }
}
