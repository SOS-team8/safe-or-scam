package com.sos.backend.domain.achievement.entity;

import com.sos.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "user_achievements",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_achievement_once", columnNames = {"user_id", "achievement_id"})
    }
)
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_achievement_id")
    private Long userAchievementId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    @Column(name = "achieved_at", nullable = false)
    private java.time.LocalDateTime achievedAt;
}
