package com.sos.backend.domain.scenario_progress.entity;

import com.sos.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "user_scenario_progress",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_scenario_progress", columnNames = {"user_id", "scenario_id"})
    }
)
public class UserScenarioProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "scenario_id", nullable = false, length = 120)
    private String scenarioId;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "discovered_ending", nullable = false, columnDefinition = "text[]")
    private List<String> discoveredEnding;

    @Column(name = "total_endings", nullable = false)
    private Integer totalEndings;

    @Column(name = "completion_rate", nullable = false)
    private Float completionRate;

    @Column(name = "play_count", nullable = false)
    private Integer playCount;

    @Column(name = "last_played_at", nullable = false)
    private LocalDateTime lastPlayedAt;
}
