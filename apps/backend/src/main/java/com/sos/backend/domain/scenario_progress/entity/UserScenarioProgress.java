package com.sos.backend.domain.scenario_progress.entity;

import com.sos.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    /** 신규(첫 플레이) 진행도. */
    public static UserScenarioProgress init(User user, String scenarioId, int totalEndings, LocalDateTime now) {
        return UserScenarioProgress.builder()
            .user(user)
            .scenarioId(scenarioId)
            .discoveredEnding(new ArrayList<>())
            .totalEndings(totalEndings)
            .completionRate(0f)
            .playCount(0)
            .lastPlayedAt(now)
            .build();
    }

    /**
     * 결말 도달 1건 반영. 발견한 결말 노드를 합집합으로 누적하고 수집도를 재계산한다.
     * totalEndings 엔딩 개수 매번 최신값으로 갱신.
     */
    public void recordEnding(String endingNodeId, int totalEndings, LocalDateTime now) {
        if (endingNodeId != null && !discoveredEnding.contains(endingNodeId)) {
            discoveredEnding.add(endingNodeId);
        }
        this.totalEndings = totalEndings;
        this.completionRate = totalEndings > 0
            ? (float) discoveredEnding.size() / totalEndings
            : 0f;
        this.playCount += 1;
        this.lastPlayedAt = now;
    }
}
