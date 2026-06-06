package com.sos.backend.global.common.json;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

/**
 * ISO-8601 문자열을 UTC 기준 {@link LocalDateTime} 으로 관대하게 파싱한다.
 * <ul>
 *   <li>오프셋/Z 포함(tz-aware): 동일 시각을 UTC 로 변환 후 LocalDateTime 으로 절단.</li>
 *   <li>오프셋 없음(naive): 이미 UTC 로 간주하고 그대로 파싱.</li>
 * </ul>
 * game-engine 이 {@code datetime.now(UTC)} 로 보내는 tz-aware ISO 를 backend 의
 * 기본 LocalDateTime 역직렬화가 거부하는 문제를 막기 위함이다.
 */
public class FlexibleUtcDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctx) throws IOException {
        String text = p.getValueAsString();
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(text)
                .withOffsetSameInstant(ZoneOffset.UTC)
                .toLocalDateTime();
        } catch (DateTimeParseException offsetMiss) {
            return LocalDateTime.parse(text);
        }
    }
}
