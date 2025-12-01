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

    @Scheduled(cron = "0 0 12 * * ?", zone = TIME_ZONE)
    @Transactional
    public void sendStreakRemindersMidday() {
        log.info("Running Midday Streak Reminder");
        sendStreakReminders("MIDDAY");
    }

    @Scheduled(cron = "0 0 17 * * ?", zone = TIME_ZONE)
    @Transactional
    public void sendStreakRemindersAfternoon() {
        log.info("Running Afternoon Streak Reminder");
        sendStreakReminders("AFTERNOON");
    }

    @Scheduled(cron = "0 0 22 * * ?", zone = TIME_ZONE)
    @Transactional
    public void sendStreakRemindersEvening() {
        log.info("Running Evening Streak Reminder");
        sendStreakReminders("EVENING");
    }

    public void sendStreakReminders(String timeSlot) {
        log.info("Start checking users (with tokens) for {} reminders...", timeSlot);
        
        List<UUID> userIdsWithToken = userFcmTokenRepository.findAllUserIdsWithTokens();
        
        if (userIdsWithToken.isEmpty()) {
            log.warn("No users with tokens found.");
            return;
        }

        List<User> users = userRepository.findAllById(userIdsWithToken);
        LocalDate today = LocalDate.now();

        String notificationKey = "STREAK_REMINDER_MIDDAY"; 
        switch (timeSlot) {
            case "AFTERNOON": notificationKey = "STREAK_REMINDER_AFTERNOON"; break;
            case "EVENING": notificationKey = "STREAK_REMINDER_EVENING"; break;
        }

        int sentCount = 0;

        for (User user : users) {
            if (user.isDeleted()) continue;
            
            try {
                UUID userId = user.getUserId();
                Long minGoal = user.getMinLearningDurationMinutes() != 0 ? user.getMinLearningDurationMinutes() : 15L;

                Long totalDurationToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, today);
                if (totalDurationToday == null) totalDurationToday = 0L;
                
                boolean hasHitDailyGoal = totalDurationToday >= minGoal;

                if (!hasHitDailyGoal && user.getStreak() > 0) {
                    long minutesRemaining = minGoal - totalDurationToday;
                    
                    String langCode = user.getNativeLanguageCode();
                    if (langCode == null) langCode = "en"; 

                    String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);

                    String content = String.format(message[1], minutesRemaining, user.getStreak());

                    NotificationRequest notificationRequest = NotificationRequest.builder()
                            .userId(userId)
                            .title(message[0])
                            .content(content)
                            .type("STREAK_REMINDER")
                            .payload("{\"screen\":\"Home\"}")
                            .build();
                    
                    notificationService.createPushNotification(notificationRequest);
                    sentCount++;
                }
            } catch (Exception e) {
                log.error("Failed to process reminder for user {}: {}", user.getUserId(), e.getMessage());
            }
        }
        log.info("Finished {} reminders. Total sent: {}", timeSlot, sentCount);
    }

    @Scheduled(cron = "0 0 0 * * ?", zone = TIME_ZONE)
    @Transactional
    public void resetStreaks() {
        log.info("Running Streak Reset (UTC Time)");
        List<User> users = userRepository.findAllByIsDeletedFalse();
        LocalDate yesterday = LocalDate.now().minusDays(1);

        for (User user : users) {
            try {
                UUID userId = user.getUserId();
                Long minGoal = user.getMinLearningDurationMinutes() != 0 ? user.getMinLearningDurationMinutes() : 15L;

                Long totalDurationYesterday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, yesterday);
                if (totalDurationYesterday == null) totalDurationYesterday = 0L;
                
                boolean hasHitDailyGoalYesterday = totalDurationYesterday >= minGoal;

                if (!hasHitDailyGoalYesterday && user.getStreak() > 0) {
                    
                    String langCode = user.getNativeLanguageCode();
                    if (langCode == null) langCode = "en";

                    String[] message = NotificationI18nUtil.getLocalizedMessage("STREAK_RESET", langCode);

                    NotificationRequest notificationRequest = NotificationRequest.builder()
                            .userId(userId)
                            .title(message[0])
                            .content(message[1])
                            .type("STREAK_RESET")
                            .payload("{\"screen\":\"Home\"}")
                            .build();
                    
                    notificationService.createPushNotification(notificationRequest);
                    log.warn("Resetting streak for user {} (Streak: {})", userId, user.getStreak());

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