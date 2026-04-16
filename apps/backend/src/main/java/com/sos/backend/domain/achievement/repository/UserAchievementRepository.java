package com.sos.backend.domain.achievement.repository;

import com.sos.backend.domain.achievement.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {
}
