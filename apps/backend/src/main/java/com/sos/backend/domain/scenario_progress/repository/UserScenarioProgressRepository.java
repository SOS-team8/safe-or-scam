package com.sos.backend.domain.scenario_progress.repository;

import com.sos.backend.domain.scenario_progress.entity.UserScenarioProgress;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserScenarioProgressRepository extends JpaRepository<UserScenarioProgress, Long> {
}
