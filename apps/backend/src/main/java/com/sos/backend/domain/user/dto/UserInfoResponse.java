package com.sos.backend.domain.user.dto;

import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.UserProfile;
import com.sos.backend.domain.user.enums.AgeGroup;
import com.sos.backend.domain.user.enums.Gender;
import com.sos.backend.domain.user.enums.Occupation;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "내 정보 조회 응답")
public record UserInfoResponse(
    @Schema(description = "이름", example = "홍길동")
    String name,

    @Schema(description = "가입 이메일", example = "hong@example.com")
    String email,

    @Schema(description = "직업", example = "EMPLOYEE")
    Occupation occupation,

    @Schema(description = "성별", example = "MALE")
    Gender gender,

    @Schema(description = "연령대", example = "TWENTIES")
    AgeGroup ageGroup
) {
    public static UserInfoResponse from(User user, UserProfile profile) {
        return new UserInfoResponse(
            user.getName(),
            user.getEmail(),
            profile.getOccupation(),
            profile.getGender(),
            profile.getAgeGroup()
        );
    }
}
