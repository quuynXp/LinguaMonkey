package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.NotificationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Notification;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserFcmToken;
import com.connectJPA.LinguaVietnameseApp.entity.UserSettings;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.NotificationMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.NotificationRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserFcmTokenRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserSettingsRepository;
import com.connectJPA.LinguaVietnameseApp.service.EmailService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.google.firebase.messaging.*;
import com.google.gson.Gson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final EmailService emailService;
    private final FirebaseMessaging firebaseMessaging;
    private final UserFcmTokenRepository userFcmTokenRepository;
    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final Gson gson = new Gson();

    @Override
    public Page<Notification> searchNotifications(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
            return Page.empty();
        }
        try {
            String currentUserIdString = SecurityContextHolder.getContext().getAuthentication().getName();
            UUID currentUserId = UUID.fromString(currentUserIdString);
            
            Pageable pageable = PageRequest.of(page, size);
            
            return notificationRepository.searchNotificationsByKeyword(currentUserId, keyword, pageable);
            
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            log.error("Error while searching notifications: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private String getUserEmailByUserId(UUID userId) {
        return userRepository.findByUserIdAndIsDeletedFalse(userId)
                .map(User::getEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private Locale getLocaleByUserId(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return user.getNativeLanguageCode() != null ? Locale.forLanguageTag(user.getNativeLanguageCode()) : Locale.getDefault();
    }

    @Override
    public Page<NotificationResponse> getAllNotifications(UUID userId, String title, String type, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Notification> notifications = notificationRepository.findByUserIdAndTitleContainingAndTypeAndIsDeletedFalse(userId, title, type, pageable);
            return notifications.map(notificationMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all notifications: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
    
    @Override
    public Page<NotificationResponse> getAllNotificationByUserId(UUID userId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Notification> notifications = notificationRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
            return notifications.map(notificationMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching notifications by user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public NotificationResponse getNotificationById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Notification notification = notificationRepository.findByNotificationIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
            
            if (!notification.isRead()) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }

            return notificationMapper.toResponse(notification);
        } catch (Exception e) {
            log.error("Error while fetching notification by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public NotificationResponse createNotification(NotificationRequest request) {
        try {
            if (request == null || request.getUserId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Notification notification = notificationMapper.toEntity(request);
            notification.setCreatedAt(OffsetDateTime.now());
            notification.setRead(false);
            notification = notificationRepository.save(notification);
            return notificationMapper.toResponse(notification);
        } catch (Exception e) {
            log.error("Error while creating notification: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

   @Override
    public void createPushNotification(NotificationRequest request) {
        Notification notification = notificationMapper.toEntity(request);
        notification.setCreatedAt(OffsetDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification); 
        sendFcmToUser(request);
    }

    private void sendFcmToUser(NotificationRequest request) {
        try {
            List<UserFcmToken> tokens = userFcmTokenRepository.findByUserIdAndIsDeletedFalse(request.getUserId());

            if (tokens.isEmpty()) {
                return;
            }

            boolean isSoundEnabled = userSettingsRepository.findById(request.getUserId())
                    .map(UserSettings::isSoundEnabled)
                    .orElse(true);

            String soundValue = isSoundEnabled ? "default" : null;

            AndroidConfig androidConfig = AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setTtl(3600 * 1000) 
                    .setNotification(AndroidNotification.builder()
                            .setSound(soundValue)
                            .setChannelId("default_channel_id")
                            .setClickAction("FLUTTER_NOTIFICATION_CLICK")
                            .build())
                    .build();
            
            ApnsConfig apnsConfig = ApnsConfig.builder()
                    .setAps(Aps.builder()
                            .setSound(soundValue)
                            .setContentAvailable(true)
                            .build())
                    .build();

            for (UserFcmToken token : tokens) {
                try {
                    Message.Builder messageBuilder = Message.builder()
                            .setToken(token.getFcmToken())
                            .setNotification(com.google.firebase.messaging.Notification.builder()
                                    .setTitle(request.getTitle())
                                    .setBody(request.getContent())
                                    .build())
                            .setAndroidConfig(androidConfig)
                            .setApnsConfig(apnsConfig);

                    if (request.getPayload() != null && !request.getPayload().isEmpty()) {
                        Map<String, String> dataPayload = gson.fromJson(request.getPayload(), Map.class);
                        messageBuilder.putAllData(dataPayload);
                    }

                    firebaseMessaging.send(messageBuilder.build());
                    log.info("Sent push notification to user {}", request.getUserId());

                } catch (FirebaseMessagingException e) {
                    log.warn("FCM Error for token ending in ...{}: {}", 
                        token.getFcmToken().substring(Math.max(0, token.getFcmToken().length() - 5)), e.getMessage());
                }
            }
        } catch (Exception e) {
            // Catch all to ensure one notification failure doesn't crash the calling thread
            log.error("General error in sendFcmToUser: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public NotificationResponse updateNotification(UUID id, NotificationRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Notification notification = notificationRepository.findByNotificationIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
            notificationMapper.updateEntityFromRequest(request, notification);
            notification.setUpdatedAt(OffsetDateTime.now());
            notification = notificationRepository.save(notification);
            return notificationMapper.toResponse(notification);
        } catch (Exception e) {
            log.error("Error while updating notification ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteNotification(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Notification notification = notificationRepository.findByNotificationIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
            notificationRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting notification ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public boolean isUserAuthorizedForNotification(UUID notificationId, UUID userId) {
        try {
            Notification notification = notificationRepository.findByNotificationIdAndIsDeletedFalse(notificationId)
                    .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
            return notification.getUserId().equals(userId);
        } catch (Exception e) {
            log.error("Error checking authorization for notification ID {} and user ID {}: {}", notificationId, userId, e.getMessage());
            return false;
        }
    }

    @Override
    public long countUnreadNotifications(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalseAndIsDeletedFalse(userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Override
    @Transactional
    public void deleteAllNotifications(UUID userId) {
        notificationRepository.deleteAllByUserId(userId);
    }

    @Override
    @Transactional
    public void sendPurchaseCourseNotification(UUID userId, String courseName) {
        try {
            if (userId == null || courseName == null || courseName.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Course Purchase: " + courseName)
                    .content("You have successfully purchased the course: " + courseName)
                    .type("COURSE_PURCHASE")
                    .build();
            createNotification(request);
            emailService.sendPurchaseCourseEmail(email, courseName, locale);
        } catch (Exception e) {
            log.error("Error sending course purchase notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendVoucherRegistrationNotification(UUID userId, String voucherCode) {
        try {
            if (userId == null || voucherCode == null || voucherCode.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Voucher Registration: " + voucherCode)
                    .content("You have registered the voucher: " + voucherCode)
                    .type("VOUCHER_REGISTRATION")
                    .build();
            createNotification(request);
            emailService.sendVoucherRegistrationEmail(email, voucherCode, locale);
        } catch (Exception e) {
            log.error("Error sending voucher registration notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendAchievementNotification(UUID userId, String title, String message) {
        try {
            if (userId == null || title == null || title.isBlank() || message == null || message.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title(title)
                    .content(message)
                    .type("ACHIEVEMENT")
                    .build();
            createNotification(request);
            emailService.sendAchievementEmail(email, title, message, locale);
        } catch (Exception e) {
            log.error("Error sending achievement notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendDailyStudyReminderNotification(UUID userId) {
        try {
            if (userId == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Daily Study Reminder")
                    .content("Don't forget to study today to maintain your streak!")
                    .type("DAILY_REMINDER")
                    .build();
            createNotification(request);
            emailService.sendDailyStudyReminder(email, locale);
        } catch (Exception e) {
            log.error("Error sending daily study reminder notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendPasswordResetNotification(UUID userId, String resetLink) {
        try {
            if (userId == null || resetLink == null || resetLink.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Password Reset Request")
                    .content("A password reset has been requested. Click the link to reset: " + resetLink)
                    .type("PASSWORD_RESET")
                    .build();
            createNotification(request);
            emailService.sendPasswordResetEmail(email, resetLink, locale);
        } catch (Exception e) {
            log.error("Error sending password reset notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendVerifyAccountNotification(UUID userId, String verifyLink) {
        try {
            if (userId == null || verifyLink == null || verifyLink.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Account Verification")
                    .content("Please verify your account using this link: " + verifyLink)
                    .type("ACCOUNT_VERIFICATION")
                    .build();
            createNotification(request);
            emailService.sendVerifyAccountEmail(email, verifyLink, locale);
        } catch (Exception e) {
            log.error("Error sending account verification notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendInactivityWarningNotification(UUID userId, int days) {
        try {
            if (userId == null || days <= 0) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Inactivity Warning")
                    .content("You have been inactive for " + days + " days. Log in to continue learning!")
                    .type("INACTIVITY_WARNING")
                    .build();
            createNotification(request);
            emailService.sendInactivityWarning(email, days, locale);
        } catch (Exception e) {
            log.error("Error sending inactivity warning notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendStreakRewardNotification(UUID userId, int streakDays) {
        try {
            if (userId == null || streakDays <= 0) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String email = getUserEmailByUserId(userId);
            Locale locale = getLocaleByUserId(userId);
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Streak Reward: " + streakDays + " Days")
                    .content("Congratulations on maintaining a " + streakDays + "-day streak! Claim your reward!")
                    .type("STREAK_REWARD")
                    .build();
            createNotification(request);
            emailService.sendStreakRewardEmail(email, streakDays, locale);
        } catch (Exception e) {
            log.error("Error sending streak reward notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void markAsRead(UUID id) {
        try {
            if (id == null) throw new AppException(ErrorCode.INVALID_KEY);
            Notification notification = notificationRepository.findByNotificationIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
            
            if (!notification.isRead()) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }
        } catch (Exception e) {
            log.error("Error marking notification as read {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendVipSuccessNotification(UUID userId, boolean isRenewal, String planType) {
        try {
            if (userId == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            
            String title = isRenewal ? "VIP Subscription Renewed! 💎" : "VIP Activated! 🌟";
            String content = isRenewal 
                ? "Your " + planType + " VIP subscription has been successfully extended."
                : "Welcome to VIP! Your " + planType + " plan is now active. Enjoy unlimited access!";
            String type = isRenewal ? "VIP_EXTENDED" : "VIP_ACTIVATED";

            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title(title)
                    .content(content)
                    .type(type)
                    .build();
            
            createNotification(request);
            createPushNotification(request); 

        } catch (Exception e) {
            log.error("Error sending VIP success notification for user ID {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}