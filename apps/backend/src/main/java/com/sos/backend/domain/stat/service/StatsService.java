package com.sos.backend.domain.stat.service;

import com.sos.backend.domain.stat.dto.UserStatResponse;
import com.sos.backend.domain.user.repository.UserStatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 통계 조회(읽기 전용). 통계 누적/쓰기는 StatsSyncService 가 담당한다.
 * 통계 행이 없는(게임 미완료) 사용자는 행을 생성하지 않고 0 통계를 반환한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService {

    private final UserStatRepository userStatRepository;

    public UserStatResponse getMyStats(Long userId) {
        return userStatRepository.findByUserId(userId)
            .map(UserStatResponse::from)
            .orElseGet(UserStatResponse::empty);
    }
}
