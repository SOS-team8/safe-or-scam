package com.sos.backend.domain.auth.entity;

import com.sos.backend.domain.auth.enums.VerificationPurpose;
import com.sos.backend.global.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "email_verifications",
    indexes = {
        @Index(name = "idx_email_verifications_email_purpose", columnList = "email, purpose")
    }
)
public class EmailVerification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "code_id")
    private Long codeId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "code", nullable = false, length = 6)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private VerificationPurpose purpose;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    @Setter
    private Integer attemptCount = 0;
}
