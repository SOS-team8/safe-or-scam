package com.sos.backend.domain.history.service;

import com.sos.backend.domain.history.dto.response.PlayLogDetailResponse;
import com.sos.backend.domain.history.dto.response.PlayLogSummaryResponse;
import com.sos.backend.domain.history.dto.response.ScenarioProgressResponse;
import com.sos.backend.global.internal.GameEngineClient;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HistoryService {

    private final GameEngineClient gameEngineClient;

    public List<ScenarioProgressResponse> getScenarioProgress(Long userId) {
        return gameEngineClient.getUserProgress(userId).stream()
            .map(ScenarioProgressResponse::from)
            .toList();
    }

    public List<PlayLogSummaryResponse> getPlayLogs(Long userId, String scenarioId) {
        return gameEngineClient.getPlayLogs(userId, scenarioId).stream()
            .map(PlayLogSummaryResponse::from)
            .toList();
    }

    public PlayLogDetailResponse getPlayLogDetail(String logId, Long userId) {
        return PlayLogDetailResponse.from(
            gameEngineClient.getPlayLogDetail(logId, userId)
        );
    }
}
