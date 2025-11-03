package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
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
        for (User user : users) {
            UUID userId = user.getUserId();
            LocalDate today = LocalDate.now();
            boolean hasActivityToday = userLearningActivityRepository.existsByUserIdAndDate(userId, today);
            if (!hasActivityToday && user.getStreak() > 0) {
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(userId)
                        .title("Keep Your Streak Alive!")
                        .content("Complete a lesson today to maintain your " + user.getStreak() + "-day streak!")
                        .type("STREAK_REMINDER")
                        .build();
                notificationService.createPushNotification(notificationRequest);
            }
        }
    }

    @Scheduled(cron = "0 0 0 * * ?") // 00:00 daily
    @Transactional
    public void resetStreaks() {
        List<User> users = userRepository.findAllByIsDeletedFalse();
        for (User user : users) {
            UUID userId = user.getUserId();
            LocalDate yesterday = LocalDate.now().minusDays(1);
            boolean hasActivityYesterday = userLearningActivityRepository.existsByUserIdAndDate(userId, yesterday);
            if (!hasActivityYesterday && user.getStreak() > 0) {
                user.setStreak(0);
                userRepository.save(user);
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(userId)
                        .title("Streak Reset")
                        .content("Your streak has been reset to 0 due to inactivity.")
                        .type("STREAK_RESET")
                        .build();
                notificationService.createNotification(notificationRequest);
            }
        }
    }
}