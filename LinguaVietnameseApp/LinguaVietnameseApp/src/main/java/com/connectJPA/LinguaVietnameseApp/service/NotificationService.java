package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.NotificationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;
import java.util.UUID;

public interface NotificationService {
    Page<NotificationResponse> getAllNotifications(UUID userId, String title, String type, Pageable pageable);
    Page<NotificationResponse> getAllNotificationByUserId(UUID userId, Pageable pageable);
    NotificationResponse getNotificationById(UUID id);
    NotificationResponse createNotification(NotificationRequest request);
    void createPushNotification(NotificationRequest request);
    NotificationResponse updateNotification(UUID id, NotificationRequest request);
    void deleteNotification(UUID id);
    boolean isUserAuthorizedForNotification(UUID notificationId, UUID userId);
    void sendPurchaseCourseNotification(UUID userId, String courseName);
    void sendVoucherRegistrationNotification(UUID userId, String voucherCode);
    void sendAchievementNotification(UUID userId, String title, String message);
    void sendDailyStudyReminderNotification(UUID userId);
    void sendPasswordResetNotification(UUID userId, String resetLink);
    void sendVerifyAccountNotification(UUID userId, String verifyLink);
    void sendInactivityWarningNotification(UUID userId, int days);
    void sendStreakRewardNotification(UUID userId, int streakDays);
    
    // THÊM: Phương thức tìm kiếm
    Page<Notification> searchNotifications(String keyword, int page, int size, Map<String, Object> filters);
}