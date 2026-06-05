package com.sos.backend.domain.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sos.backend.domain.notification.entity.Notification;
import com.sos.backend.domain.user.enums.NotificationType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "알림 항목")
public record NotificationResponse(
    @Schema(description = "알림 ID", example = "1")
    Long id,

    @Schema(description = "알림 종류", example = "ACHIEVEMENT")
    NotificationType type,

    @Schema(description = "알림 제목", example = "결말 수집가")
    String title,

    @Schema(description = "참조 ID (업적 ID, 시나리오 ID 등)")
    @JsonProperty("reference_id")
    String referenceId,

    @Schema(description = "읽음 여부", example = "false")
    @JsonProperty("is_read")
    boolean isRead,

    @Schema(description = "생성 시각")
    @JsonProperty("created_at")
    LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
            n.getId(),
            n.getType(),
            n.getTitle(),
            n.getReferencedId(),
            Boolean.TRUE.equals(n.getIsRead()),
            n.getCreatedAt()
        );
    }
}
