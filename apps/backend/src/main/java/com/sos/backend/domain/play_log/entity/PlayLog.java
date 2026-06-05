package com.sos.backend.domain.play_log.entity;

import com.sos.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "play_logs")
public class PlayLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "play_log_id", nullable = false, length = 255)
    private String playLogId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "scenario_id", length = 255)
    private String scenarioId;

    @Column(name = "session_id", length = 255)
    private String sessionId;

    @Column(name = "ending_type", length = 50)
    private String endingType;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "dangerous_count")
    private Integer dangerousCount;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
