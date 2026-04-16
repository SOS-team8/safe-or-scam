package com.sos.backend.domain.scenario_progress.repository;

import com.sos.backend.domain.scenario_progress.entity.UserScenarioProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserScenarioProgressRepository extends JpaRepository<UserScenarioProgress, Long> {

    Optional<UserScenarioProgress> findByUserIdAndScenarioId(Long userId, String scenarioId);
}
