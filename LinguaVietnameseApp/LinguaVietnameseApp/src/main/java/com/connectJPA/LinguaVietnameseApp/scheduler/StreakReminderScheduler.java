package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
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

    // --- SỬA ĐỔI: Phân tách logic theo thời điểm ---

    @Scheduled(cron = "0 0 12 * * ?") // 12:00 daily
    @Transactional
    public void sendStreakRemindersMidday() {
        log.info("Running Midday Streak Reminder (12:00).");
        sendStreakReminders("MIDDAY");
    }

    @Scheduled(cron = "0 0 17 * * ?") // 17:00 daily
    @Transactional
    public void sendStreakRemindersAfternoon() {
        log.info("Running Afternoon Streak Reminder (17:00).");
        sendStreakReminders("AFTERNOON");
    }

    @Scheduled(cron = "0 0 22 * * ?") // 22:00 daily
    @Transactional
    public void sendStreakRemindersEvening() {
        log.info("Running Evening Streak Reminder (22:00).");
        sendStreakReminders("EVENING");
    }

    // Hàm logic cốt lõi
    public void sendStreakReminders(String timeSlot) {
        List<User> users = userRepository.findAllByIsDeletedFalse();
        LocalDate today = LocalDate.now();

        String notificationKey;
        switch (timeSlot) {
            case "AFTERNOON":
                notificationKey = "STREAK_REMINDER_AFTERNOON";
                break;
            case "EVENING":
                notificationKey = "STREAK_REMINDER_EVENING";
                break;
            case "MIDDAY":
            default:
                notificationKey = "STREAK_REMINDER_MIDDAY";
                break;
        }

        for (User user : users) {
            UUID userId = user.getUserId();
            // Cần giả định user.getMinLearningDurationMinutes() trả về 15 hoặc tương đương
            Long minGoal = user.getMinLearningDurationMinutes() != 0 ? user.getMinLearningDurationMinutes() : 15L;

            // Giả định sumDurationMinutesByUserIdAndDate trả về Long (tổng số phút)
            Long totalDurationToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, today);
            if (totalDurationToday == null) totalDurationToday = 0L;
            
            boolean hasHitDailyGoal = totalDurationToday >= minGoal;

            if (!hasHitDailyGoal && user.getStreak() > 0) {
                long minutesRemaining = minGoal - totalDurationToday;
                
                String langCode = user.getNativeLanguageCode();
                String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);
                
                // Content format: (minutesRemaining, currentStreak)
                String content = String.format(message[1], minutesRemaining, user.getStreak());

                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(userId)
                        .title(message[0])
                        .content(content)
                        .type("STREAK_REMINDER")
                        .payload("{\"screen\":\"Learn\"}")
                        .build();
                notificationService.createPushNotification(notificationRequest);
                log.info("Sent {} reminder to user {} (Remaining: {}m, Streak: {})", 
                         timeSlot, userId, minutesRemaining, user.getStreak());
            }
        }
    }

    // --- Logic reset chuỗi vẫn giữ nguyên ---

    @Scheduled(cron = "0 0 0 * * ?") // 00:00 daily
    @Transactional
    public void resetStreaks() {
        log.info("Running Streak Reset (00:00).");
        List<User> users = userRepository.findAllByIsDeletedFalse();
        LocalDate yesterday = LocalDate.now().minusDays(1);

        for (User user : users) {
            UUID userId = user.getUserId();
            // Cần giả định user.getMinLearningDurationMinutes() trả về 15 hoặc tương đương
            Long minGoal = user.getMinLearningDurationMinutes() != 0 ? user.getMinLearningDurationMinutes() : 15L;

            Long totalDurationYesterday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, yesterday);
            if (totalDurationYesterday == null) totalDurationYesterday = 0L;
            
            boolean hasHitDailyGoalYesterday = totalDurationYesterday >= minGoal;

            if (!hasHitDailyGoalYesterday && user.getStreak() > 0) {
                
                String langCode = user.getNativeLanguageCode();
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
        }
    }
}