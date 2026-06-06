package com.sos.backend.domain.history.service;

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
}
