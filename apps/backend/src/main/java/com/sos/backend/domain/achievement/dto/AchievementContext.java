package com.sos.backend.domain.achievement.dto;

/**
 * 업적 평가 입력. StatsSyncService 가 통계/진행도 갱신 후 값을 채워 전달한다.
 *
 * @param completePlays         누적 완료 판 수 (이번 판 반영 후)
 * @param goodEndings           누적 안전 결말 수 (이번 판 반영 후)
 * @param dangerousCountThisPlay 이번 판에서 한 위험 선택 수
 * @param currentCompletionRate 이번에 플레이한 시나리오의 갱신된 수집도(0.0~1.0)
 */
public record AchievementContext(
    int completePlays,
    int goodEndings,
    int dangerousCountThisPlay,
    float currentCompletionRate
) {
}
