package com.sos.backend.domain.notification.service;

import com.sos.backend.domain.notification.dto.NotificationResponse;
import com.sos.backend.domain.notification.entity.Notification;
import com.sos.backend.domain.notification.repository.NotificationRepository;
import com.sos.backend.domain.user.entity.User;
import com.sos.backend.domain.user.enums.NotificationType;
import com.sos.backend.global.common.exception.CustomException;
import com.sos.backend.global.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification create(User user, NotificationType type, String title, String referenceId) {
        return notificationRepository.save(Notification.builder()
            .user(user)
            .type(type)
            .title(title)
            .referencedId(referenceId)
            .isRead(false)
            .createdAt(LocalDateTime.now())
            .build());
    }

    public List<NotificationResponse> list(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(NotificationResponse::from)
            .toList();
    }

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markAsRead();
    }

    @Transactional
    public void deleteOne(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteAll(Long userId) {
        notificationRepository.deleteAllByUserId(userId);
    }
}
