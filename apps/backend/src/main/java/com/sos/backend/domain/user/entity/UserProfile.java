package com.sos.backend.domain.user.entity;

import com.sos.backend.domain.user.enums.Gender;
import com.sos.backend.domain.user.enums.AgeGroup;
import com.sos.backend.domain.user.enums.Occupation;
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
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "occupation", length = 30)
    private Occupation occupation;

    @Column(name = "birth")
    private Integer birth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "age_group", length = 30)
    private AgeGroup ageGroup;

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

    public void updateBasicInfo(Occupation occupation, Gender gender, AgeGroup ageGroup) {
        this.occupation = occupation;
        this.gender = gender;
        this.ageGroup = ageGroup;
    }

    public void completeOnboarding(
        Occupation occupation,
        Gender gender,
        AgeGroup ageGroup,
        List<String> economicActivities,
        List<String> communicateChannels,
        List<String> onlineActivities,
        List<String> financialChannels,
        List<String> familyType
    ) {
        this.occupation = occupation;
        this.gender = gender;
        this.ageGroup = ageGroup;
        this.economicActivities = economicActivities;
        this.communicateChannels = communicateChannels;
        this.onlineActivities = onlineActivities;
        this.financialChannels = financialChannels;
        this.familyType = familyType;
        this.onboardingCompleted = true;
    }
}
