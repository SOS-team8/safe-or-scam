package com.sos.backend.domain.user.entity;

import com.sos.backend.global.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "user_stats")
public class UserStat extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stat_id")
    private Long statId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_plays", nullable = false)
    private Integer totalPlays;

    @Column(name = "complete_plays", nullable = false)
    private Integer completePlays;

    @Column(name = "good_endings", nullable = false)
    private Integer goodEndings;

    // NOTE: DB typo column 'bad_endingsI' -> Java field 'badEndings'
    @Column(name = "bad_endings", nullable = false)
    private Integer badEndings;

    @Column(name = "total_dangerous_choices", nullable = false)
    private Integer totalDangerousChoices;

    @Column(name = "avg_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal avgScore;

    @Column(name = "best_score", nullable = false)
    private Integer bestScore;
}
