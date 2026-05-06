package com.sos.backend.global.auth;

import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class UserStatusCacheService {

    private static final long TTL_MILLIS = 60_000L;

    private final UserRepository userRepository;
    private final Map<Long, CacheEntry> cache = new ConcurrentHashMap<>();

    public UserStatusCacheService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserStatus getStatus(Long userId) {
        long now = System.currentTimeMillis();
        CacheEntry cached = cache.get(userId);
        if (cached != null && cached.expiresAtMillis() > now) {
            return cached.status();
        }

        UserStatus loaded = userRepository.findById(userId)
            .map(User::getStatus)
            .orElse(null);

        if (loaded == null) {
            cache.remove(userId);
            return null;
        }

        cache.put(userId, new CacheEntry(loaded, now + TTL_MILLIS));
        return loaded;
    }

    public void invalidate(Long userId) {
        cache.remove(userId);
    }

    private record CacheEntry(UserStatus status, long expiresAtMillis) {
    }
}
