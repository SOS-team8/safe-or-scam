package com.sos.backend.domain.user.repository;

import com.sos.backend.domain.user.entity.UserStat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserStatRepository extends JpaRepository<UserStat, Long> {
    Optional<UserStat> findByUserId(Long userId);
}
