package com.sos.backend.domain.stat.service;

import com.sos.backend.domain.achievement.dto.AchievementContext;
import com.sos.backend.domain.achievement.entity.Achievement;
import com.sos.backend.domain.achievement.service.AchievementService;
import com.sos.backend.domain.notification.service.NotificationService;
import com.sos.backend.domain.play_log.entity.PlayLog;
import com.sos.backend.domain.play_log.repository.PlayLogRepository;
import com.sos.backend.domain.stat.dto.GameCompletedRequest;
import com.sos.backend.domain.stat.dto.GameCompletedResponse;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.UserStat;
import com.sos.backend.domain.user.enums.NotificationType;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.domain.user.repository.UserStatRepository;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 게임 완료 동기화 처리: 누적 통계 갱신 → 업적 평가·부여 → 업적 알림 생성.
 * play_log_id 로 멱등성을 보장(중복 동기화 시 빈 결과 반환).
 * 시나리오별 수집도(progress)는 game-engine MongoDB 가 소유하며, 업적 평가용
 * 수집도는 요청 본문의 completion_rate 로 전달받는다(backend 미적재).
 */
@Service
@RequiredArgsConstructor
public class StatsSyncService {

    private final UserRepository userRepository;
    private final UserStatRepository userStatRepository;
    private final PlayLogRepository playLogRepository;
    private final AchievementService achievementService;
    private final NotificationService notificationService;

    @Transactional
    public GameCompletedResponse handleGameCompleted(GameCompletedRequest req) {
        if (playLogRepository.existsByPlayLogId(req.playLogId())) {
            return GameCompletedResponse.from(List.of());
        }
        User user = userRepository.findById(req.userId())
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime completedAt = req.completedAt() != null ? req.completedAt() : now;
        boolean goodEnding = "ending_good".equals(req.endingType());

        // 1. 누적 통계 갱신
        UserStat stat = userStatRepository.findByUserId(user.getId())
            .orElseGet(() -> userStatRepository.save(UserStat.init(user)));
        stat.recordCompletion(goodEnding, req.dangerousCountOrZero(), req.totalScoreOrZero());

        // 2. 완료 기록 + 멱등성 키 저장
        playLogRepository.save(PlayLog.builder()
            .playLogId(req.playLogId())
            .user(user)
            .scenarioId(req.scenarioId())
            .sessionId(req.sessionId())
            .endingType(req.endingType())
            .totalScore(req.totalScore())
            .dangerousCount(req.dangerousCount())
            .durationSeconds(req.durationSeconds())
            .completedAt(completedAt)
            .createdAt(now)
            .build());

        // 3. 업적 평가·부여 (수집도는 game-engine 이 계산해 보낸 completion_rate 사용)
        AchievementContext ctx = new AchievementContext(
            stat.getCompletePlays(),
            stat.getGoodEndings(),
            req.dangerousCountOrZero(),
            req.completionRateOrZero()
        );
        List<Achievement> unlocked = achievementService.evaluateAndGrant(user, ctx);

        // 4. 업적 달성 알림 생성
        for (Achievement achievement : unlocked) {
            notificationService.create(
                user,
                NotificationType.ACHIEVEMENT,
                achievement.getTitle(),
                String.valueOf(achievement.getAchievementId())
            );
        }

        return GameCompletedResponse.from(unlocked);
    }
}
