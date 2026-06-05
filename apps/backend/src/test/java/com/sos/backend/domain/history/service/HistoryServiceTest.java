package com.sos.backend.domain.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

import com.sos.backend.domain.history.dto.response.ScenarioProgressResponse;
import com.sos.backend.global.internal.GameEngineClient;
import com.sos.backend.global.internal.dto.ScenarioProgressInternalResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HistoryServiceTest {

    @Mock
    private GameEngineClient gameEngineClient;

    @InjectMocks
    private HistoryService historyService;

    @Test
    void getScenarioProgress_mapsInternalToPublic() {
        long userId = 1001L;
        given(gameEngineClient.getUserProgress(userId)).willReturn(List.of(
            new ScenarioProgressInternalResponse("scenario_5d6e8982", 0.0138, 3, 217, "2026-04-01T14:30:00.000Z")
        ));

        List<ScenarioProgressResponse> result = historyService.getScenarioProgress(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).scenarioId()).isEqualTo("scenario_5d6e8982");
        assertThat(result.get(0).completionRate()).isEqualTo(0.0138);
        assertThat(result.get(0).discoveredCount()).isEqualTo(3);
        assertThat(result.get(0).totalEndings()).isEqualTo(217);
        assertThat(result.get(0).lastPlayedAt()).isEqualTo("2026-04-01T14:30:00.000Z");
    }

    @Test
    void getScenarioProgress_returnsEmptyWhenNoProgress() {
        given(gameEngineClient.getUserProgress(anyLong())).willReturn(List.of());

        assertThat(historyService.getScenarioProgress(1001L)).isEmpty();
    }
}
