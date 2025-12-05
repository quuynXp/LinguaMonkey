package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserFcmTokenRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class StreakReminderScheduler {
    private final UserRepository userRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final NotificationService notificationService;
    private final UserFcmTokenRepository userFcmTokenRepository;

    private static final String TIME_ZONE = "UTC";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // 12:00 VN = 05:00 UTC
    @Scheduled(cron = "0 0 5 * * ?", zone = TIME_ZONE)
    @Transactional
    public void sendStreakRemindersMidday() {
        log.info("Running Midday Streak Reminder (VN Time)");
        sendStreakReminders("MIDDAY");
    }

    // 17:00 VN = 10:00 UTC
    @Scheduled(cron = "0 0 10 * * ?", zone = TIME_ZONE)
    @Transactional
    public void sendStreakRemindersAfternoon() {
        log.info("Running Afternoon Streak Reminder (VN Time)");
        sendStreakReminders("AFTERNOON");
    }

    // 22:00 VN = 15:00 UTC
    @Scheduled(cron = "0 0 15 * * ?", zone = TIME_ZONE)
    @Transactional
    public void sendStreakRemindersEvening() {
        log.info("Running Evening Streak Reminder (VN Time)");
        sendStreakReminders("EVENING");
    }

    public void sendStreakReminders(String timeSlot) {
        List<UUID> userIdsWithToken = userFcmTokenRepository.findAllUserIdsWithTokens();
        if (userIdsWithToken.isEmpty()) return;

        List<User> users = userRepository.findAllById(userIdsWithToken);
        // Fix: Use VN Time to check progress for "today"
        LocalDate today = LocalDate.now(VN_ZONE);

        String notificationKey = "STREAK_REMINDER_MIDDAY"; 
        switch (timeSlot) {
            case "AFTERNOON": notificationKey = "STREAK_REMINDER_AFTERNOON"; break;
            case "EVENING": notificationKey = "STREAK_REMINDER_EVENING"; break;
        }

        for (User user : users) {
            if (user.isDeleted() || !user.getUserSettings().isStreakReminders()) continue;
            
            try {
                UUID userId = user.getUserId();
                Long minGoal = user.getMinLearningDurationMinutes() != 0 ? user.getMinLearningDurationMinutes() : 15L;
                Long totalDurationToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, today);
                if (totalDurationToday == null) totalDurationToday = 0L;
                
                boolean hasHitDailyGoal = totalDurationToday >= minGoal;

                if (!hasHitDailyGoal && user.getStreak() > 0) {
                    long minutesRemaining = minGoal - totalDurationToday;
                    String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en"; 
                    String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);

                    NotificationRequest notificationRequest = NotificationRequest.builder()
                            .userId(userId)
                            .title(message[0])
                            .content(String.format(message[1], minutesRemaining, user.getStreak()))
                            .type("STREAK_REMINDER")
                            .payload("{\"screen\":\"Home\"}")
                            .build();
                    
                    notificationService.createPushNotification(notificationRequest);
                }
            } catch (Exception e) {
                log.error("Failed to process reminder for user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }

    // 00:00 VN = 17:00 UTC (Previous Day)
    @Scheduled(cron = "0 0 17 * * ?", zone = TIME_ZONE)
    @Transactional
    public void resetStreaks() {
        log.info("Running Streak Reset (VN Time Sync)");
        List<User> users = userRepository.findAllByIsDeletedFalse();
        
        // Fix: Calculate "yesterday" based on VN time, not Server UTC time
        LocalDate yesterday = LocalDate.now(VN_ZONE).minusDays(1);

        for (User user : users) {
            try {
                UUID userId = user.getUserId();
                Long minGoal = user.getMinLearningDurationMinutes() != 0 ? user.getMinLearningDurationMinutes() : 15L;
                Long totalDurationYesterday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, yesterday);
                if (totalDurationYesterday == null) totalDurationYesterday = 0L;
                
                boolean hasHitDailyGoalYesterday = totalDurationYesterday >= minGoal;

                if (!hasHitDailyGoalYesterday && user.getStreak() > 0) {
                    String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
                    String[] message = NotificationI18nUtil.getLocalizedMessage("STREAK_RESET", langCode);

                    if (user.getUserSettings().isStreakReminders()) {
                        NotificationRequest notificationRequest = NotificationRequest.builder()
                                .userId(userId)
                                .title(message[0])
                                .content(message[1])
                                .type("STREAK_RESET")
                                .payload("{\"screen\":\"Home\"}")
                                .build();
                        notificationService.createPushNotification(notificationRequest);
                    }
                    
                    user.setStreak(0);
                    user.setLastStreakCheckDate(null);
                    userRepository.save(user);
                }
            } catch (Exception e) {
                log.error("Failed to reset streak for user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }
}