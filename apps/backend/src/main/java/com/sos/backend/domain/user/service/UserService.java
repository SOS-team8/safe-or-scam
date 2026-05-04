package com.sos.backend.domain.user.service;

import com.sos.backend.domain.user.dto.OnboardingRequest;
import com.sos.backend.domain.user.dto.UserActionResponse;
import com.sos.backend.domain.user.dto.UserInfoResponse;
import com.sos.backend.domain.user.dto.UserUpdateRequest;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.entity.UserProfile;
import com.sos.backend.domain.user.enums.CommunicateChannel;
import com.sos.backend.domain.user.enums.EconomicActivity;
import com.sos.backend.domain.user.enums.FinancialChannel;
import com.sos.backend.domain.user.enums.OnlineActivity;
import com.sos.backend.domain.user.enums.UserStatus;
import com.sos.backend.domain.user.repository.UserProfileRepository;
import com.sos.backend.domain.user.repository.UserRepository;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    public UserInfoResponse getMyInfo(Long userId) {
        User user = getUser(userId);
        UserProfile profile = getUserProfile(userId);
        return UserInfoResponse.from(user, profile);
    }

    @Transactional
    public UserActionResponse updateMyInfo(Long userId, UserUpdateRequest request) {
        getUser(userId);
        UserProfile profile = getUserProfile(userId);

        profile.updateBasicInfo(request.occupation(), request.gender(), request.ageGroup());
        return UserActionResponse.of("내 정보가 수정되었습니다.");
    }

    @Transactional
    public UserActionResponse onboard(Long userId, OnboardingRequest request) {
        User user = getUser(userId);
        UserProfile profile = getUserProfile(userId);

        if (user.getStatus() == UserStatus.ACTIVE) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        profile.completeOnboarding(
            request.occupation(),
            request.gender(),
            request.ageGroup(),
            request.economicActivities().stream().map(EconomicActivity::code).toList(),
            request.communicateChannels().stream().map(CommunicateChannel::code).toList(),
            request.onlineActivities().stream().map(OnlineActivity::code).toList(),
            request.financialChannels().stream().map(FinancialChannel::code).toList(),
            List.of(request.familyType().code())
        );
        user.changeStatus(UserStatus.ACTIVE);

        return UserActionResponse.of("온보딩이 완료되었습니다.");
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private UserProfile getUserProfile(Long userId) {
        return userProfileRepository.findByUserId(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
    }
}
