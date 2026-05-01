package com.sos.backend.domain.auth.entity;

import com.sos.backend.domain.auth.enums.Provider;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.global.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;


@Getter
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "auth_providers",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_auth_providers_provider_provider_id", columnNames = {"provider", "provider_id"}),
        @UniqueConstraint(name = "uk_auth_providers_user_provider", columnNames = {"user_id", "provider"})
    }
)
public class AuthProvider extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "auth_provider_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private Provider provider;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @PrePersist
    @PreUpdate
    private void validateProviderId() {
        if (provider == Provider.LOCAL && providerId != null) {
            throw new IllegalStateException("LOCAL provider는 provider_id를 가질 수 없습니다");
        }
        if (provider != Provider.LOCAL && (providerId == null || providerId.isBlank())) {
            throw new IllegalStateException("OAuth provider는 provider_id가 필수입니다");
        }
    }
}
