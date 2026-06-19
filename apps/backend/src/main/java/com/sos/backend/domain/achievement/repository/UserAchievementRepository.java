package com.sos.backend.domain.achievement.repository;

import com.sos.backend.domain.achievement.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    @Query("select ua.achievement.achievementId from UserAchievement ua where ua.user.id = :userId")
    List<Long> findAchievementIdsByUserId(@Param("userId") Long userId);

    @Query("select ua from UserAchievement ua join fetch ua.achievement "
        + "where ua.user.id = :userId order by ua.achievedAt desc")
    List<UserAchievement> findByUserIdWithAchievement(@Param("userId") Long userId);
}
