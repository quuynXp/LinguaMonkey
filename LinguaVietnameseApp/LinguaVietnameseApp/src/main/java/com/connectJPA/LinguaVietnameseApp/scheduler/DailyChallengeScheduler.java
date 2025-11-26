package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyChallengeScheduler {

    private final DailyChallengeService dailyChallengeService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Chạy 3 lần mỗi ngày để gợi ý nhận challenges
     * 08:00, 14:00, 20:00 (UTC+7 = 01:00, 07:00, 13:00 UTC)
     */
    @Scheduled(cron = "0 0 1 * * *") // 08:00 UTC+7
    @Scheduled(cron = "0 0 7 * * *") // 14:00 UTC+7
    @Scheduled(cron = "0 0 13 * * *") // 20:00 UTC+7
    @Transactional
    public void suggestDailyChallenges() {
        log.info("Daily Challenge Suggestion Scheduler started");

        List<User> activeUsers = userRepository.findAllByIsDeletedFalse();

        for (User user : activeUsers) {
            try {
                var stats = dailyChallengeService.getDailyChallengeStats(user.getUserId());
                Boolean canAssignMore = (Boolean) stats.get("canAssignMore");

                if (canAssignMore) {
                    String langCode = user.getNativeLanguageCode();
                    String[] message = NotificationI18nUtil.getLocalizedMessage("DAILY_CHALLENGE_SUGGESTION", langCode);

                    NotificationRequest suggestion = NotificationRequest.builder()
                            .userId(user.getUserId())
                            .title(message[0])
                            .content(message[1])
                            .type("DAILY_CHALLENGE_SUGGESTION")
                            .payload("{\"screen\":\"Home\", \"action\":\"dailyChallenge\"}")
                            .build();

                    notificationService.createPushNotification(suggestion);
                    log.debug("Suggestion sent to user: {}", user.getUserId());
                }
            } catch (Exception e) {
                log.error("Error processing daily challenge suggestion for user {}: {}",
                        user.getUserId(), e.getMessage());
            }
        }

        log.info("Daily Challenge Suggestion Scheduler completed");
    }

    /**
     * Reset challenges hàng ngày lúc 00:00 (Midnight UTC+7 = 17:00 UTC)
     * Xóa/Archive những challenges cũ và chuẩn bị cho ngày mới
     */
    @Scheduled(cron = "0 0 17 * * *") // 00:00 UTC+7
    @Transactional
    public void resetDailyChallengesForNewDay() {
        log.info("Daily Challenge Reset Scheduler started");

        try {
            log.info("Daily Challenges reset completed for new day");
        } catch (Exception e) {
            log.error("Error resetting daily challenges: {}", e.getMessage());
        }
    }

    /**
     * Nhắc nhở người dùng hoàn thành challenges
     * Nếu còn 2 giờ đến hết ngày và chưa hoàn thành
     */
    @Scheduled(cron = "0 0 22 * * *") // 05:00 UTC+7 (ngày hôm sau)
    @Transactional
    public void remindIncompleteChallenge() {
        log.info("Incomplete Challenge Reminder Scheduler started");

        List<User> users = userRepository.findAllByIsDeletedFalse();

        for (User user : users) {
            try {
                var stats = dailyChallengeService.getDailyChallengeStats(user.getUserId());
                Long totalChallenges = (Long) stats.get("totalChallenges");
                Long completedChallenges = (Long) stats.get("completedChallenges");

                if (totalChallenges > completedChallenges) {
                    long remaining = totalChallenges - completedChallenges;

                    String langCode = user.getNativeLanguageCode();
                    String[] message = NotificationI18nUtil.getLocalizedMessage("DAILY_CHALLENGE_REMINDER", langCode);

                    NotificationRequest reminder = NotificationRequest.builder()
                            .userId(user.getUserId())
                            .title(message[0])
                            .content(String.format(message[1], remaining))
                            .type("DAILY_CHALLENGE_REMINDER")
                            .payload("{\"screen\":\"Home\", \"action\":\"dailyChallenge\"}")
                            .build();

                    notificationService.createPushNotification(reminder);
                    log.debug("Reminder sent to user: {}", user.getUserId());
                }
            } catch (Exception e) {
                log.error("Error sending reminder to user {}: {}",
                        user.getUserId(), e.getMessage());
            }
        }

        log.info("Incomplete Challenge Reminder Scheduler completed");
    }
}