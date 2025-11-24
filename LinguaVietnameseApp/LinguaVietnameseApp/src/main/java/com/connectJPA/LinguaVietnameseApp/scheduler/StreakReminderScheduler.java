package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.util.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class StreakReminderScheduler {
    private final UserRepository userRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0 12 * * ?") // 12:00 daily
    @Scheduled(cron = "0 0 17 * * ?") // 17:00 daily
    @Scheduled(cron = "0 0 22 * * ?") // 22:00 daily
    @Transactional
    public void sendStreakReminders() {
        List<User> users = userRepository.findAllByIsDeletedFalse();
        LocalDate today = LocalDate.now();

        for (User user : users) {
            UUID userId = user.getUserId();
            Long totalDurationToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, today);
            
            boolean hasHitDailyGoal = totalDurationToday >= user.getMinLearningDurationMinutes();

            if (!hasHitDailyGoal && user.getStreak() > 0) {
                long minutesRemaining = user.getMinLearningDurationMinutes() - totalDurationToday;
                
                String langCode = user.getNativeLanguageCode();
                String[] message = NotificationI18nUtil.getLocalizedMessage("STREAK_REMINDER", langCode);

                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(userId)
                        .title(message[0])
                        .content(String.format(message[1], minutesRemaining, user.getStreak()))
                        .type("STREAK_REMINDER")
                        .payload("{\"screen\":\"Learn\"}")
                        .build();
                notificationService.createPushNotification(notificationRequest);
            }
        }
    }

    @Scheduled(cron = "0 0 0 * * ?") // 00:00 daily
    @Transactional
    public void resetStreaks() {
        List<User> users = userRepository.findAllByIsDeletedFalse();
        LocalDate yesterday = LocalDate.now().minusDays(1);

        for (User user : users) {
            UUID userId = user.getUserId();
            
            Long totalDurationYesterday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(userId, yesterday);
            
            boolean hasHitDailyGoalYesterday = totalDurationYesterday >= user.getMinLearningDurationMinutes();

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

                user.setStreak(0);
                user.setLastStreakCheckDate(null);
                userRepository.save(user);
            }
        }
    }
}