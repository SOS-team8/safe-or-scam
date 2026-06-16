package com.sos.backend.domain.stat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

import com.sos.backend.domain.stat.dto.PhishingBreakdownResponse;
import com.sos.backend.domain.user.repository.UserStatRepository;
import com.sos.backend.global.internal.GameEngineClient;
import com.sos.backend.global.internal.dto.PhishingBreakdownInternalResponse;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private UserStatRepository userStatRepository;

    @Mock
    private GameEngineClient gameEngineClient;

    @InjectMocks
    private StatsService statsService;

    @Test
    void getPhishingBreakdown_mapsInternalToPublic() {
        long userId = 1001L;
        given(gameEngineClient.getPhishingBreakdown(userId)).willReturn(List.of(
            new PhishingBreakdownInternalResponse("smishing", 5, 3, 1.4, 62.5),
            new PhishingBreakdownInternalResponse("voice_phishing", 2, 0, 3.0, 28.0)
        ));

        List<PhishingBreakdownResponse> result = statsService.getPhishingBreakdown(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).phishingType()).isEqualTo("smishing");
        assertThat(result.get(0).playCount()).isEqualTo(5);
        assertThat(result.get(0).goodCount()).isEqualTo(3);
        assertThat(result.get(0).avgDangerous()).isEqualTo(1.4);
        assertThat(result.get(0).avgScore()).isEqualTo(62.5);
        assertThat(result.get(1).phishingType()).isEqualTo("voice_phishing");
        assertThat(result.get(1).goodCount()).isEqualTo(0);
    }

    @Test
    void getPhishingBreakdown_returnsEmptyWhenNoPlays() {
        given(gameEngineClient.getPhishingBreakdown(anyLong())).willReturn(List.of());

        assertThat(statsService.getPhishingBreakdown(1001L)).isEmpty();
    }
}
