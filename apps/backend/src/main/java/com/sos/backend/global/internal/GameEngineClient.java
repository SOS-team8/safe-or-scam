package com.sos.backend.global.internal;

import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import com.sos.backend.global.internal.dto.ScenarioProgressInternalResponse;
import com.sos.backend.global.internal.dto.PlayLogSummaryInternalResponse;
import java.time.Duration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class GameEngineClient {

    private static final String API_KEY_HEADER = "X-Internal-Api-Key";

    private final RestClient restClient;

    public GameEngineClient(RestClient.Builder builder, InternalApiProperties properties) {
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.defaults()
            .withConnectTimeout(Duration.ofSeconds(2))
            .withReadTimeout(Duration.ofSeconds(3));
        this.restClient = builder
            .baseUrl(properties.baseUrl())
            .defaultHeader(API_KEY_HEADER, properties.apiKey())
            .requestFactory(ClientHttpRequestFactoryBuilder.detect().build(settings))
            .build();
    }

    public List<ScenarioProgressInternalResponse> getUserProgress(long userId) {
        try {
            List<ScenarioProgressInternalResponse> result = restClient.get()
                .uri("/api/internal/progress/{userId}", userId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ScenarioProgressInternalResponse>>() {});
            return result != null ? result : List.of();
        } catch (RestClientException e) {
            log.error("Game Engine internal progress call failed: userId={}", userId, e);
            throw new CustomException(ErrorCode.INTERNAL_API_ERROR);
        }
    }

    public List<PlayLogSummaryInternalResponse> getPlayLogs(long userId, String scenarioId) {
        try {
            List<PlayLogSummaryInternalResponse> result = restClient.get()
                .uri("/api/internal/play-logs/user/{userId}?scenario_id={scenarioId}", userId, scenarioId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<PlayLogSummaryInternalResponse>>() {});
            return result != null ? result : List.of();
        } catch (RestClientException e) {
            log.error("Game Engine internal play-logs call failed: userId={}, scenarioId={}",
                userId, scenarioId, e);
            throw new CustomException(ErrorCode.INTERNAL_API_ERROR);
        }
    }
}
