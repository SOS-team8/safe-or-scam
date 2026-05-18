package com.sos.backend.domain.user;

import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.UserProfile;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserProfileRepository;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.global.common.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/v1/users/me 응답 shape 검증 (auth-boundary.md §4, ADR-006).
 *
 * 필수 6 필드: id, email, name, role, status, created_at
 * 선택 필드 (회원가입 정보 보존): occupation, gender, age_group
 *
 * Testcontainers PostgreSQL이 필요. Docker 없는 환경에서는 무시.
 */
@AutoConfigureMockMvc
@DisplayName("/api/v1/users/me 응답 shape (ADR-006)")
class UserMeResponseTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    private Long testUserId;

    @BeforeEach
    void setUp() {
        User user = userRepository.save(User.builder()
            .email("me-response-test@example.com")
            .name("미리스폰테스트")
            .role(Role.USER)
            .status(UserStatus.ACTIVE)
            .build());
        testUserId = user.getId();

        userProfileRepository.save(UserProfile.builder()
            .user(user)
            .onboardingCompleted(true)
            .build());

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                testUserId,
                "me-response-test@example.com",
                Collections.emptyList()
            )
        );
    }

    @Test
    @DisplayName("응답에 id, email, name, role, status, created_at이 포함된다 (필수 6필드)")
    void responseIncludesRequiredFields() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(testUserId))
            .andExpect(jsonPath("$.data.email").value("me-response-test@example.com"))
            .andExpect(jsonPath("$.data.name").value("미리스폰테스트"))
            .andExpect(jsonPath("$.data.role").value("USER"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.createdAt").exists());
    }
}
