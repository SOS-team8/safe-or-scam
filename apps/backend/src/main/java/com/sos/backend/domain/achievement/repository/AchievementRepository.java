package com.sos.backend.domain.achievement.repository;

import com.sos.backend.domain.achievement.entity.Achievement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AchievementRepository extends JpaRepository<Achievement, Long> {
}
