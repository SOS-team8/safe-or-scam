package com.sos.backend.domain.achievement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

import com.sos.backend.domain.achievement.dto.AchievementResponse;
import com.sos.backend.domain.achievement.entity.Achievement;
import com.sos.backend.domain.achievement.entity.UserAchievement;
import com.sos.backend.domain.achievement.repository.AchievementRepository;
import com.sos.backend.domain.achievement.repository.UserAchievementRepository;
import com.sos.backend.domain.user.entity.UserStat;
import com.sos.backend.domain.user.repository.UserStatRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private UserAchievementRepository userAchievementRepository;

    @Mock
    private UserStatRepository userStatRepository;

    @InjectMocks
    private AchievementService achievementService;

    private static Achievement achievement(long id, String code, String conditionValue) {
        return Achievement.builder()
            .achievementId(id)
            .code(code)
            .title(code)
            .description("d")
            .iconUrl(null)
            .conditionValue(conditionValue)
            .build();
    }

    private Map<String, AchievementResponse> run(UserStat stat) {
        given(userAchievementRepository.findByUserIdWithAchievement(anyLong()))
            .willReturn(List.<UserAchievement>of());
        given(userStatRepository.findByUserId(anyLong())).willReturn(Optional.ofNullable(stat));
        given(achievementRepository.findAll()).willReturn(List.of(
            achievement(1, "FIRST_CLEAR", "1"),
            achievement(2, "PLAY_10", "10"),
            achievement(3, "PLAY_30", "30"),
            achievement(4, "GOOD_ENDING_5", "5"),
            achievement(5, "FLAWLESS", "0"),
            achievement(6, "FULL_COLLECTION", "1.0")
        ));
        return achievementService.getMyAchievements(1001L).stream()
            .collect(Collectors.toMap(AchievementResponse::code, r -> r));
    }

    @Test
    void cumulativeAchievementsExposeProgressCappedAtTarget() {
        UserStat stat = UserStat.builder().completePlays(12).goodEndings(3).build();

        Map<String, AchievementResponse> byCode = run(stat);

        // completePlays(12) 기반 — 달성 완료분은 target 으로 캡
        assertThat(byCode.get("FIRST_CLEAR").progressCurrent()).isEqualTo(1); // min(12, 1)
        assertThat(byCode.get("FIRST_CLEAR").progressTarget()).isEqualTo(1);
        assertThat(byCode.get("PLAY_10").progressCurrent()).isEqualTo(10); // min(12, 10) 캡
        assertThat(byCode.get("PLAY_10").progressTarget()).isEqualTo(10);
        assertThat(byCode.get("PLAY_30").progressCurrent()).isEqualTo(12);
        assertThat(byCode.get("PLAY_30").progressTarget()).isEqualTo(30);
        // goodEndings(3) 기반
        assertThat(byCode.get("GOOD_ENDING_5").progressCurrent()).isEqualTo(3);
        assertThat(byCode.get("GOOD_ENDING_5").progressTarget()).isEqualTo(5);
    }

    @Test
    void nonCumulativeAchievementsHaveNullProgress() {
        Map<String, AchievementResponse> byCode =
            run(UserStat.builder().completePlays(5).goodEndings(5).build());

        // per-play(FLAWLESS) / per-scenario(FULL_COLLECTION) 은 누적 N/M 불가 → null
        assertThat(byCode.get("FLAWLESS").progressCurrent()).isNull();
        assertThat(byCode.get("FLAWLESS").progressTarget()).isNull();
        assertThat(byCode.get("FULL_COLLECTION").progressCurrent()).isNull();
        assertThat(byCode.get("FULL_COLLECTION").progressTarget()).isNull();
    }

    @Test
    void missingUserStatYieldsZeroCurrent() {
        Map<String, AchievementResponse> byCode = run(null);

        assertThat(byCode.get("PLAY_10").progressCurrent()).isEqualTo(0);
        assertThat(byCode.get("PLAY_10").progressTarget()).isEqualTo(10);
        assertThat(byCode.get("GOOD_ENDING_5").progressCurrent()).isEqualTo(0);
        assertThat(byCode.get("GOOD_ENDING_5").progressTarget()).isEqualTo(5);
    }
}
