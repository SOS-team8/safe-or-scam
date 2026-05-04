package com.sos.backend.global.common;

import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@Disabled("Redis/Mail 의존성 추가로 통합 테스트 인프라 보강 필요. 별도 이슈에서 처리 예정.")
@DisplayName("테스트 인프라 동작 검증")
public class InfrastructureSmokeTest extends AbstractIntegrationTest{

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("TestContainer가 기동되고 JPA를 통해 User를 저장/조회할 수 있다")
    void canSaveFindUser() {
        // given
        User user = User.builder()
            .email("smoke@test.com")
            .name("스모크 테스트")
            .role(Role.USER)
            .status(UserStatus.ACTIVE)
            .build();

        // when
        User saved = userRepository.save(user);
        entityManager.flush();
        entityManager.clear();
        User found = userRepository.findById(saved.getId()).orElseThrow();

        // then
        assertThat(found.getId()).isNotNull();
        assertThat(found.getEmail()).isEqualTo("smoke@test.com");
    }

    @Test
    @DisplayName("BaseEntity의 createdAt, updatedAt이 자동으로 채워진다")
    void baseEntityAuditingWorks() {
        // given
        User user = User.builder()
            .email("auditing@test.com")
            .name("어디팅 테스트")
            .role(Role.USER)
            .status(UserStatus.ACTIVE)
            .build();

        // when
        User saved = userRepository.save(user);
        entityManager.flush();
        entityManager.clear();
        User found = userRepository.findById(saved.getId()).orElseThrow();

        // then
        assertThat(found.getCreatedAt()).isNotNull();
        assertThat(found.getUpdatedAt()).isNotNull();
    }
}
