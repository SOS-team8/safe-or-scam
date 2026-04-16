package com.sos.backend.domain.game_session.entity;

import com.sos.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "game_sessions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_game_sessions_session_id", columnNames = "session_id")
    }
)
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "game_session_id")
    private Long id;

    @Column(name = "session_id", nullable = false, length = 120)
    private String sessionId;

    @Column(name = "scenario_id", nullable = false)
    private String scenarioId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "current_node_id", nullable = false, length = 120)
    private String currentNodeId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    @Column(name = "resources", nullable = false, columnDefinition = "jsonb")
    private Map<String, Integer> resources = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    @Column(name = "choices_history", nullable = false, columnDefinition = "jsonb")
    private List<Map<String, Object>> choicesHistory = new ArrayList<>();

    @Column(name = "dangerous_count", nullable = false)
    private int dangerousCount;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Builder.Default
    @Column(name = "visited_endings", nullable = false, columnDefinition = "text[]")
    private List<String> visitedEndings = new ArrayList<>();

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
