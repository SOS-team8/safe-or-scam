package com.sos.backend.domain.scenario_progress.repository;

import com.sos.backend.domain.scenario_progress.entity.UserScenarioProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserScenarioProgressRepository extends JpaRepository<UserScenarioProgress, Long> {

    @Modifying
    @Query("delete from UserScenarioProgress usp where usp.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Query("select usp from UserScenarioProgress usp where usp.user.id = :userId and usp.scenarioId = :scenarioId")
    Optional<UserScenarioProgress> findByUserIdAndScenarioId(@Param("userId") Long userId,
                                                             @Param("scenarioId") String scenarioId);
}
