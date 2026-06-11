package com.sos.backend.domain.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.sos.backend.domain.history.dto.response.PlayLogSummaryResponse;
import com.sos.backend.domain.history.dto.response.ScenarioProgressResponse;
import com.sos.backend.global.internal.GameEngineClient;
import com.sos.backend.global.internal.dto.PlayLogSummaryInternalResponse;
import com.sos.backend.global.internal.dto.ScenarioProgressInternalResponse;

import java.time.LocalDateTime;
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
            new ScenarioProgressInternalResponse("scenario_5d6e8982", 0.0138, 3, 217, LocalDateTime.of(2026,4,1,14,30,0))
        ));

        List<ScenarioProgressResponse> result = historyService.getScenarioProgress(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).scenarioId()).isEqualTo("scenario_5d6e8982");
        assertThat(result.get(0).completionRate()).isEqualTo(0.0138);
        assertThat(result.get(0).discoveredCount()).isEqualTo(3);
        assertThat(result.get(0).totalEndings()).isEqualTo(217);
        assertThat(result.get(0).lastPlayedAt()).isEqualTo(LocalDateTime.of(2026,4,1,14,30,0));
    }

    @Test
    void getScenarioProgress_returnsEmptyWhenNoProgress() {
        given(gameEngineClient.getUserProgress(anyLong())).willReturn(List.of());

        assertThat(historyService.getScenarioProgress(1001L)).isEmpty();
    }

    @Test
    void getPlayLogs_mapsInternalToPublic() {
        long userId = 1001L;
        String scenarioId = "scenario_5d6e8982";
        given(gameEngineClient.getPlayLogs(userId, scenarioId)).willReturn(List.of(
            new PlayLogSummaryInternalResponse(
                "log_x9y8z7w6v5", "ending_bad", 22, 4, 487,
                LocalDateTime.of(2026, 4, 1, 10, 8, 7)
            )
        ));

        List<PlayLogSummaryResponse> result = historyService.getPlayLogs(userId, scenarioId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).logId()).isEqualTo("log_x9y8z7w6v5");
        assertThat(result.get(0).endingType()).isEqualTo("ending_bad");
        assertThat(result.get(0).totalScore()).isEqualTo(22);
        assertThat(result.get(0).dangerousCount()).isEqualTo(4);
        assertThat(result.get(0).durationSeconds()).isEqualTo(487);
        assertThat(result.get(0).completedAt()).isEqualTo(LocalDateTime.of(2026, 4, 1, 10, 8, 7));
    }

    @Test
    void getPlayLogs_returnsEmptyWhenNone() {
        given(gameEngineClient.getPlayLogs(anyLong(), anyString())).willReturn(List.of());

        assertThat(historyService.getPlayLogs(1001L, "scenario_x")).isEmpty();
    }
}
