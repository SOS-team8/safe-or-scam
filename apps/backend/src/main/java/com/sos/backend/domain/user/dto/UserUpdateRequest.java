package com.sos.backend.domain.user.dto;

import com.sos.backend.domain.user.enums.AgeGroup;
import com.sos.backend.domain.user.enums.Gender;
import com.sos.backend.domain.user.enums.Occupation;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "내 정보 수정 요청")
public record UserUpdateRequest(
    @Schema(
        description = "직업 (고정 값)",
        example = "UNIV_STUDENT",
        allowableValues = {"STUDENT_K12", "UNIV_STUDENT", "JOB_SEEKER", "EMPLOYEE", "SELF_EMPLOYED", "FREELANCER", "HOMEMAKER", "UNEMPLOYED", "OTHER"}
    )
    @NotNull(message = "occupation은 필수입니다")
    Occupation occupation,

    @Schema(description = "성별", example = "FEMALE")
    @NotNull(message = "gender는 필수입니다")
    Gender gender,

    @Schema(description = "연령대", example = "TEENS")
    @NotNull(message = "ageGroup은 필수입니다")
    AgeGroup ageGroup
) {
}
