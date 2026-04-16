package com.sos.backend.domain.user.entity;

import com.sos.backend.domain.common.enums.Gender;
import com.sos.backend.global.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "user_profiles")
public class UserProfile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long profileId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "occupation", length = 50)
    private String occupation;

    @Column(name = "birth")
    private Integer birth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender;

    @Column(name = "onboarding_completed", nullable = false)
    private Boolean onboardingCompleted;

    /** 설문조사 **/
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "economic_activities", columnDefinition = "text[]")
    private List<String> economicActivities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "communicate_channels", columnDefinition = "text[]")
    private List<String> communicateChannels;

    // NOTE: DB typo column 'online_activities' -> Java field 'onlineActivities'
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "online_activities", columnDefinition = "text[]")
    private List<String> onlineActivities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "financial_channels", columnDefinition = "text[]")
    private List<String> financialChannels;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "family_type", columnDefinition = "text[]")
    private List<String> familyType;
}
