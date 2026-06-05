package com.sos.backend.domain.play_log.repository;

import com.sos.backend.domain.play_log.entity.PlayLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayLogRepository extends JpaRepository<PlayLog, Long> {

    boolean existsByPlayLogId(String playLogId);
}
