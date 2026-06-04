package com.sos.backend.domain.user.dto;

import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.UserProfile;
import com.sos.backend.domain.user.enums.AgeGroup;
import com.sos.backend.domain.user.enums.CommunicateChannel;
import com.sos.backend.domain.user.enums.EconomicActivity;
import com.sos.backend.domain.user.enums.FamilyType;
import com.sos.backend.domain.user.enums.FinancialChannel;
import com.sos.backend.domain.user.enums.Gender;
import com.sos.backend.domain.user.enums.OnlineActivity;
import com.sos.backend.domain.user.enums.Occupation;
import com.sos.backend.domain.user.enums.Role;
import com.sos.backend.domain.user.enums.UserStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;

/**
 * 내 정보 조회 응답 (auth-boundary.md §4, ADR-006 union shape).
 *
 * 필수 (auth-boundary v1 §4): id, email, name, role, status, created_at
 * 선택 (회원가입 정보 보존): occupation, gender, ageGroup, onboarding survey fields
 */
@Schema(description = "내 정보 조회 응답")
public record UserInfoResponse(
    @Schema(description = "사용자 ID", example = "1")
    Long id,

    @Schema(description = "가입 이메일", example = "hong@example.com")
    String email,

    @Schema(description = "이름", example = "홍길동")
    String name,

    @Schema(description = "권한", example = "USER")
    Role role,

    @Schema(description = "계정 상태", example = "ACTIVE")
    UserStatus status,

    @Schema(description = "가입일", example = "2026-05-18T12:34:56")
    LocalDateTime createdAt,

    @Schema(description = "직업", example = "EMPLOYEE")
    Occupation occupation,

    @Schema(description = "성별", example = "MALE")
    Gender gender,

    @Schema(description = "연령대", example = "TWENTIES")
    AgeGroup ageGroup,

    @Schema(description = "평소 소비 활동")
    List<EconomicActivity> economicActivities,

    @Schema(description = "자주 사용하는 연락 수단")
    List<CommunicateChannel> communicateChannels,

    @Schema(description = "최근 한 달 내 온라인 활동")
    List<OnlineActivity> onlineActivities,

    @Schema(description = "평소 금융 거래 방식")
    List<FinancialChannel> financialChannels,

    @Schema(description = "가족 구성", example = "WITH_PARENTS")
    FamilyType familyType
) {
    public static UserInfoResponse from(User user, UserProfile profile) {
        return new UserInfoResponse(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getRole(),
            user.getStatus(),
            user.getCreatedAt(),
            profile != null ? profile.getOccupation() : null,
            profile != null ? profile.getGender() : null,
            profile != null ? profile.getAgeGroup() : null,
            profile != null ? toEnums(profile.getEconomicActivities(), EconomicActivity::fromCode) : List.of(),
            profile != null ? toEnums(profile.getCommunicateChannels(), CommunicateChannel::fromCode) : List.of(),
            profile != null ? toEnums(profile.getOnlineActivities(), OnlineActivity::fromCode) : List.of(),
            profile != null ? toEnums(profile.getFinancialChannels(), FinancialChannel::fromCode) : List.of(),
            profile != null ? profile.getFamilyType() : null
        );
    }

    private static <T> List<T> toEnums(List<String> codes, Function<String, T> mapper) {
        if (codes == null) {
            return List.of();
        }
        return codes.stream()
            .filter(code -> code != null && !code.isBlank())
            .map(mapper)
            .toList();
    }
}
