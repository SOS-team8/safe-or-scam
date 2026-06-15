package com.sos.backend.domain.achievement.service;

import com.sos.backend.domain.achievement.dto.AchievementContext;
import com.sos.backend.domain.achievement.dto.AchievementResponse;
import com.sos.backend.domain.achievement.entity.Achievement;
import com.sos.backend.domain.achievement.entity.UserAchievement;
import com.sos.backend.domain.achievement.repository.AchievementRepository;
import com.sos.backend.domain.achievement.repository.UserAchievementRepository;
import com.sos.backend.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;

    @Transactional
    public List<Achievement> evaluateAndGrant(User user, AchievementContext ctx) {
        List<Achievement> newlyGranted = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        // 보유 업적 ID 를 한 번에 조회해 메모리에서 중복 확인 (N+1 회피)
        Set<Long> ownedAchievementIds = new HashSet<>(userAchievementRepository.findAchievementIdsByUserId(user.getId()));

        for (Achievement achievement : achievementRepository.findAll()) {
            if (ownedAchievementIds.contains(achievement.getAchievementId())) {
                continue;
            }
            if (!isSatisfied(achievement, ctx)) {
                continue;
            }
            userAchievementRepository.save(UserAchievement.builder()
                .user(user)
                .achievement(achievement)
                .achievedAt(now)
                .build());
            newlyGranted.add(achievement);
        }
        return newlyGranted;
    }

    /** 사용자의 전체 업적 목록(보유/미보유)을 반환한다. */
    public List<AchievementResponse> getMyAchievements(Long userId) {
        Map<Long, LocalDateTime> achievedAtById = userAchievementRepository.findByUserIdWithAchievement(userId).stream()
            .collect(Collectors.toMap(
                ua -> ua.getAchievement().getAchievementId(),
                UserAchievement::getAchievedAt
            ));

        return achievementRepository.findAll().stream()
            .map(a -> AchievementResponse.of(a, achievedAtById.get(a.getAchievementId())))
            .toList();
    }

    /**
     * 업적 code 별 달성 조건. condition_value 를 임계값으로 사용한다.
     * 새 업적 추가 시 이 switch 와 시드(V*__seed) 만 함께 늘리면 된다.
     */
    private boolean isSatisfied(Achievement achievement, AchievementContext ctx) {
        String value = achievement.getConditionValue();
        try {
            return switch (achievement.getCode()) {
                case "FIRST_CLEAR" -> ctx.completePlays() >= Integer.parseInt(value);
                case "PLAY_10" -> ctx.completePlays() >= Integer.parseInt(value);
                case "PLAY_30" -> ctx.completePlays() >= Integer.parseInt(value);
                case "FULL_COLLECTION" -> ctx.currentCompletionRate() >= Float.parseFloat(value);
                case "GOOD_ENDING_5" -> ctx.goodEndings() >= Integer.parseInt(value);
                case "FLAWLESS" -> ctx.dangerousCountThisPlay() <= Integer.parseInt(value);
                default -> false;
            };
        } catch (NumberFormatException e) {
            log.warn("Invalid condition_value '{}' for achievement code '{}'", value, achievement.getCode());
            return false;
        }
    }
}
