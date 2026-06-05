package com.sos.backend.domain.stat.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * game-engine 이 보내는 다양한 형태의 completed_at(ISO-8601) 을 backend 가
 * UTC 기준 LocalDateTime 으로 안전하게 역직렬화하는지 검증한다.
 * Spring Boot 기본 Jackson(JavaTimeModule, timestamps off) 환경을 그대로 재현.
 */
class GameCompletedRequestDeserializeTest {

    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private GameCompletedRequest parseWithCompletedAt(String completedAtJson) throws Exception {
        String json = """
            {
              "play_log_id": "k-1",
              "user_id": 1,
              "scenario_id": "s-1",
              "ending_type": "ending_good",
              "scenario_total_endings": 2,
              "completed_at": %s
            }
            """.formatted(completedAtJson);
        return mapper.readValue(json, GameCompletedRequest.class);
    }

    @Test
    @DisplayName("Z(UTC) 오프셋 ISO 를 그대로 UTC LocalDateTime 으로 파싱한다")
    void parsesZuluOffset() throws Exception {
        GameCompletedRequest req = parseWithCompletedAt("\"2026-06-05T05:40:58Z\"");
        assertThat(req.completedAt()).isEqualTo(LocalDateTime.of(2026, 6, 5, 5, 40, 58));
    }

    @Test
    @DisplayName("+09:00 오프셋 ISO 를 동일 시각의 UTC LocalDateTime 으로 정규화한다")
    void normalizesPositiveOffsetToUtc() throws Exception {
        GameCompletedRequest req = parseWithCompletedAt("\"2026-06-05T14:40:58+09:00\"");
        assertThat(req.completedAt()).isEqualTo(LocalDateTime.of(2026, 6, 5, 5, 40, 58));
    }

    @Test
    @DisplayName("오프셋 없는 naive ISO 는 UTC 로 간주하고 그대로 파싱한다")
    void parsesNaiveAsUtc() throws Exception {
        GameCompletedRequest req = parseWithCompletedAt("\"2026-06-05T05:40:58\"");
        assertThat(req.completedAt()).isEqualTo(LocalDateTime.of(2026, 6, 5, 5, 40, 58));
    }

    @Test
    @DisplayName("completed_at 이 null 이면 null 로 둔다 (서비스가 now 로 대체)")
    void allowsNull() throws Exception {
        GameCompletedRequest req = parseWithCompletedAt("null");
        assertThat(req.completedAt()).isNull();
    }
}
