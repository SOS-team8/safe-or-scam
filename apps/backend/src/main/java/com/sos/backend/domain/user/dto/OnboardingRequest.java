package com.sos.backend.domain.user.dto;

import com.sos.backend.domain.user.enums.*;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@Schema(description = "온보딩 요청")
public record OnboardingRequest(
    @Schema(
        description = "직업 (고정 값)",
        example = "EMPLOYEE",
        allowableValues = {"STUDENT_K12", "UNIV_STUDENT", "JOB_SEEKER", "EMPLOYEE", "SELF_EMPLOYED", "FREELANCER", "HOMEMAKER", "UNEMPLOYED", "OTHER"}
    )
    @NotNull(message = "occupation은 필수입니다")
    Occupation occupation,

    @Schema(description = "성별", example = "MALE")
    @NotNull(message = "gender는 필수입니다")
    Gender gender,

    @Schema(
        description = "연령대",
        example = "THIRTIES",
        allowableValues = {"TEENS", "TWENTIES", "THIRTIES", "FORTIES", "FIFTIES", "SIXTIES_AND_ABOVE"}
    )
    @NotNull(message = "ageGroup은 필수입니다")
    AgeGroup ageGroup,

    @ArraySchema(
        schema = @Schema(implementation = EconomicActivity.class),
        arraySchema = @Schema(description = "질문1: 소비 활동 (다중선택)", example = "[\"ENTERTAINMENT\",\"TRAVEL\"]")
    )
    @NotEmpty(message = "economicActivities는 1개 이상 선택해야 합니다")
    List<@NotNull EconomicActivity> economicActivities,

    @ArraySchema(
        schema = @Schema(implementation = CommunicateChannel.class),
        arraySchema = @Schema(description = "질문2: 주 소통 채널 (다중선택)", example = "[\"PHONE\",\"MESSENGER\"]"))
    @NotEmpty(message = "communicateChannels는 1개 이상 선택해야 합니다")
    List<@NotNull CommunicateChannel> communicateChannels,

    @ArraySchema(
        schema = @Schema(implementation = OnlineActivity.class),
        arraySchema = @Schema(description = "질문3: 온라인 활동 (다중선택)", example = "[\"ONLINE_SHOPPING\",\"DELIVERY\"]"))
    @NotEmpty(message = "onlineActivities는 1개 이상 선택해야 합니다")
    List<@NotNull OnlineActivity> onlineActivities,

    @ArraySchema(
        schema = @Schema(implementation = FinancialChannel.class),
        arraySchema = @Schema(description = "질문4: 금융 채널 (다중선택)", example = "[\"MOBILE_BANKING\",\"EASY_PAY\"]"))
    @NotEmpty(message = "financialChannels는 1개 이상 선택해야 합니다")
    List<@NotNull FinancialChannel> financialChannels,

    @Schema(description = "질문5: 가족 형태 (단일선택)", example = "WITH_PARENTS")
    @NotNull(message = "familyType은 필수입니다")
    FamilyType familyType
) {
}
