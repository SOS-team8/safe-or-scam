package com.sos.backend.domain.game_session.repository;

import com.sos.backend.domain.game_session.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
    Optional<GameSession> findBySessionId(String sessionId);

    @Modifying
    @Query("delete from GameSession gs where gs.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);
}
