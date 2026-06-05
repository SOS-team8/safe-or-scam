package com.sos.backend.domain.achievement.repository;

import com.sos.backend.domain.achievement.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    @Query("select count(ua) > 0 from UserAchievement ua "
        + "where ua.user.id = :userId and ua.achievement.achievementId = :achievementId")
    boolean existsByUserAndAchievement(@Param("userId") Long userId,
                                       @Param("achievementId") Long achievementId);

    @Query("select ua from UserAchievement ua join fetch ua.achievement "
        + "where ua.user.id = :userId order by ua.achievedAt desc")
    List<UserAchievement> findByUserIdWithAchievement(@Param("userId") Long userId);
}
