package com.sos.backend.domain.notification.entity;

import com.sos.backend.domain.user.enums.NotificationType;
import com.sos.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "reference_id", length = 255)
    private String referencedId;

    @Column(name = "is_read")
    private Boolean isRead;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Long createdAt;
}
