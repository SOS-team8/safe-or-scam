package com.sos.backend.domain.stat.service;

import com.sos.backend.domain.stat.dto.PhishingBreakdownResponse;
import com.sos.backend.domain.stat.dto.UserStatResponse;
import com.sos.backend.domain.user.repository.UserStatRepository;
import com.sos.backend.global.internal.GameEngineClient;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 통계 조회(읽기 전용). 통계 누적/쓰기는 StatsSyncService 가 담당한다.
 * 통계 행이 없는(게임 미완료) 사용자는 행을 생성하지 않고 0 통계를 반환한다.
 * 사기 유형별 집계는 play_logs 를 보유한 game-engine 으로 프록시한다(history 패턴).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService {

    private final UserStatRepository userStatRepository;
    private final GameEngineClient gameEngineClient;

    public UserStatResponse getMyStats(Long userId) {
        return userStatRepository.findByUserId(userId)
            .map(UserStatResponse::from)
            .orElseGet(UserStatResponse::empty);
    }

    public List<PhishingBreakdownResponse> getPhishingBreakdown(Long userId) {
        return gameEngineClient.getPhishingBreakdown(userId).stream()
            .map(PhishingBreakdownResponse::from)
            .toList();
    }
}
