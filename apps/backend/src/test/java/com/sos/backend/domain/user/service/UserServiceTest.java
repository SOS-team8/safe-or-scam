package com.sos.backend.domain.user.service;

import com.sos.backend.domain.user.dto.OnboardingRequest;
import com.sos.backend.domain.user.dto.UserActionResponse;
import com.sos.backend.domain.user.dto.UserInfoResponse;
import com.sos.backend.domain.user.dto.UserUpdateRequest;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.UserProfile;
import com.sos.backend.domain.user.enums.*;
import com.sos.backend.domain.user.repository.UserProfileRepository;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @InjectMocks
    private UserService userService;

    @Nested
    @DisplayName("내 정보 조회")
    class GetMyInfo {

        @Test
        @DisplayName("유저와 프로필이 존재하면 기본 정보를 반환한다")
        void getMyInfo_success() {
            Long userId = 1L;
            User user = createUser(userId, UserStatus.ONBOARDING);
            UserProfile profile = createProfile(userId, user);

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userProfileRepository.findByUserId(userId)).willReturn(Optional.of(profile));

            UserInfoResponse response = userService.getMyInfo(userId);

            assertThat(response.name()).isEqualTo("홍길동");
            assertThat(response.email()).isEqualTo("hong@example.com");
            assertThat(response.occupation()).isEqualTo(Occupation.EMPLOYEE);
            assertThat(response.gender()).isEqualTo(Gender.MALE);
            assertThat(response.ageGroup()).isEqualTo(AgeGroup.TWENTIES);
        }

        @Test
        @DisplayName("유저가 없으면 USER_NOT_FOUND 예외를 던진다")
        void getMyInfo_userNotFound() {
            Long userId = 999L;
            given(userRepository.findById(userId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getMyInfo(userId))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_NOT_FOUND);

            verify(userProfileRepository, never()).findByUserId(userId);
        }
    }

    @Nested
    @DisplayName("내 정보 수정")
    class UpdateMyInfo {

        @Test
        @DisplayName("직업/성별/연령대를 수정한다")
        void updateMyInfo_success() {
            Long userId = 1L;
            User user = createUser(userId, UserStatus.ONBOARDING);
            UserProfile profile = createProfile(userId, user);
            UserUpdateRequest request = new UserUpdateRequest(
                Occupation.FREELANCER,
                Gender.FEMALE,
                AgeGroup.THIRTIES
            );

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userProfileRepository.findByUserId(userId)).willReturn(Optional.of(profile));

            UserActionResponse response = userService.updateMyInfo(userId, request);

            assertThat(response.message()).isEqualTo("내 정보가 수정되었습니다.");
            assertThat(profile.getOccupation()).isEqualTo(Occupation.FREELANCER);
            assertThat(profile.getGender()).isEqualTo(Gender.FEMALE);
            assertThat(profile.getAgeGroup()).isEqualTo(AgeGroup.THIRTIES);
        }
    }

    @Nested
    @DisplayName("온보딩")
    class Onboard {

        @Test
        @DisplayName("이미 ACTIVE 상태면 INVALID_INPUT 예외를 던진다")
        void onboard_alreadyActive() {
            Long userId = 1L;
            User user = createUser(userId, UserStatus.ACTIVE);
            UserProfile profile = createProfile(userId, user);
            OnboardingRequest request = createOnboardingRequest();

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userProfileRepository.findByUserId(userId)).willReturn(Optional.of(profile));

            assertThatThrownBy(() -> userService.onboard(userId, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        }

        @Test
        @DisplayName("온보딩 완료 시 프로필 저장값을 반영하고 UserStatus를 ACTIVE로 변경한다")
        void onboard_success() {
            Long userId = 1L;
            User user = createUser(userId, UserStatus.ONBOARDING);
            UserProfile profile = createProfile(userId, user);
            OnboardingRequest request = createOnboardingRequest();

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userProfileRepository.findByUserId(userId)).willReturn(Optional.of(profile));

            UserActionResponse response = userService.onboard(userId, request);

            assertThat(response.message()).isEqualTo("온보딩이 완료되었습니다.");
            assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
            assertThat(profile.getOnboardingCompleted()).isTrue();
            assertThat(profile.getOccupation()).isEqualTo(Occupation.EMPLOYEE);
            assertThat(profile.getEconomicActivities()).containsExactly("entertainment", "travel");
            assertThat(profile.getCommunicateChannels()).containsExactly("phone", "email");
            assertThat(profile.getOnlineActivities()).containsExactly("delivery", "government");
            assertThat(profile.getFinancialChannels()).containsExactly("mobile_banking", "easy_pay");
            assertThat(profile.getFamilyType()).containsExactly("with_parents");
        }

        @Test
        @DisplayName("프로필이 없으면 NOT_FOUND 예외를 던진다")
        void onboard_profileNotFound() {
            Long userId = 1L;
            User user = createUser(userId, UserStatus.ONBOARDING);
            OnboardingRequest request = createOnboardingRequest();

            given(userRepository.findById(userId)).willReturn(Optional.of(user));
            given(userProfileRepository.findByUserId(userId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> userService.onboard(userId, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
        }
    }

    private User createUser(Long id, UserStatus status) {
        return User.builder()
            .id(id)
            .email("hong@example.com")
            .name("홍길동")
            .role(Role.USER)
            .status(status)
            .build();
    }

    private UserProfile createProfile(Long userId, User user) {
        return UserProfile.builder()
            .userId(userId)
            .user(user)
            .occupation(Occupation.EMPLOYEE)
            .gender(Gender.MALE)
            .ageGroup(AgeGroup.TWENTIES)
            .onboardingCompleted(false)
            .economicActivities(List.of())
            .communicateChannels(List.of())
            .onlineActivities(List.of())
            .financialChannels(List.of())
            .familyType(List.of())
            .build();
    }

    private OnboardingRequest createOnboardingRequest() {
        return new OnboardingRequest(
            Occupation.EMPLOYEE,
            Gender.MALE,
            AgeGroup.TWENTIES,
            List.of(EconomicActivity.ENTERTAINMENT, EconomicActivity.TRAVEL),
            List.of(CommunicateChannel.PHONE, CommunicateChannel.EMAIL),
            List.of(OnlineActivity.DELIVERY, OnlineActivity.GOVERNMENT),
            List.of(FinancialChannel.MOBILE_BANKING, FinancialChannel.EASY_PAY),
            FamilyType.WITH_PARENTS
        );
    }
}
