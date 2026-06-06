package com.sos.backend.domain.user.entity;

import com.sos.backend.global.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

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

    /** 신규 유저용 0 초기화 통계. */
    public static UserStat init(User user) {
        return UserStat.builder()
            .user(user)
            .totalPlays(0)
            .completePlays(0)
            .goodEndings(0)
            .badEndings(0)
            .totalDangerousChoices(0)
            .avgScore(BigDecimal.ZERO)
            .bestScore(0)
            .build();
    }

    /**
     * 게임 완료 1건 반영. game-engine 은 완료 이벤트만 보내므로 totalPlays 와 completePlays 를 함께 증가시킨다.
     * avgScore 는 completePlays 기준 누적 평균으로 갱신한다.
     */
    public void recordCompletion(boolean goodEnding, int dangerousCount, int score) {
        BigDecimal accumulated = avgScore.multiply(BigDecimal.valueOf(completePlays));
        this.totalPlays += 1;
        this.completePlays += 1;
        if (goodEnding) {
            this.goodEndings += 1;
        } else {
            this.badEndings += 1;
        }
        this.totalDangerousChoices += dangerousCount;
        this.avgScore = accumulated.add(BigDecimal.valueOf(score))
            .divide(BigDecimal.valueOf(completePlays), 2, RoundingMode.HALF_UP);
        if (score > this.bestScore) {
            this.bestScore = score;
        }
    }
}
