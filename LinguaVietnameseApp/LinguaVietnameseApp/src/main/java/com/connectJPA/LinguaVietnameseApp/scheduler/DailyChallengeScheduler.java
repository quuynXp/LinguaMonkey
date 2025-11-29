package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserFcmTokenRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyChallengeScheduler {

    private final DailyChallengeService dailyChallengeService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    // Inject thêm Repo này để lọc user
    private final UserFcmTokenRepository userFcmTokenRepository;

    private static final String TIME_ZONE = "Asia/Ho_Chi_Minh";

    /**
     * --- TEST METHOD: FORCE PUSH ---
     * TỐI ƯU: Chỉ gửi cho users có FCM Token.
     */
    @Scheduled(cron = "0/60 * * * * ?", zone = TIME_ZONE)
    @Transactional
    public void forceTestNotification() {
        log.info(">>> [DEBUG-SCHEDULER] Running Force Test Notification (Every 60s)...");

        // 1. Lấy danh sách ID có token trước
        List<UUID> userIdsWithToken = userFcmTokenRepository.findAllUserIdsWithTokens();

        if (userIdsWithToken.isEmpty()) {
            log.warn(">>> [DEBUG-SCHEDULER] No users with FCM tokens found! Skipping.");
            return;
        }

        // 2. Chỉ query thông tin của những user này
        List<User> users = userRepository.findAllById(userIdsWithToken);

        log.info(">>> [DEBUG-SCHEDULER] Found {} users with valid tokens. Sending pings...", users.size());

        int sentCount = 0;
        for (User user : users) {
            // Check lại active cho chắc
            if (user.isDeleted()) continue;

            try {
                log.info(">>> [DEBUG-SCHEDULER] Sending test ping to User: {} (Email: {})", user.getUserId(), user.getEmail());

                NotificationRequest request = NotificationRequest.builder()
                        .userId(user.getUserId())
                        .title("DEBUG: Test Ping " + LocalDateTime.now().toLocalTime())
                        .content("System heartbeat. Push working for verified devices only!")
                        .type("SYSTEM_TEST")
                        .payload("{\"screen\":\"Home\"}")
                        .build();

                notificationService.createPushNotification(request);
                sentCount++;
            } catch (Exception e) {
                log.error(">>> [DEBUG-SCHEDULER] FAILED to send ping to user {}: {}", user.getUserId(), e.getMessage());
            }
        }
        log.info(">>> [DEBUG-SCHEDULER] Test run finished. Sent: {}", sentCount);
    }

    @Scheduled(cron = "0 0/5 * * * ?", zone = TIME_ZONE)
    @Transactional
    public void suggestDailyChallenges() {
        log.info("[DailyChallengeScheduler] Checking candidates for challenges...");

        // Tương tự: Chỉ gợi ý cho người có Token (để họ nhận đc Noti vào App học)
        // Nếu muốn gợi ý cho cả web user thì dùng lại findAllByIsDeletedFalse()
        List<UUID> userIdsWithToken = userFcmTokenRepository.findAllUserIdsWithTokens();
        if (userIdsWithToken.isEmpty()) return;
        
        List<User> activeUsers = userRepository.findAllById(userIdsWithToken);

        for (User user : activeUsers) {
            if (user.isDeleted()) continue;
            try {
                var stats = dailyChallengeService.getDailyChallengeStats(user.getUserId());
                Boolean canAssignMore = (Boolean) stats.get("canAssignMore");

                if (Boolean.TRUE.equals(canAssignMore)) {
                    log.info(">>> User {} is eligible. Sending suggestion...", user.getUserId());
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
                }
            } catch (Exception e) {
                log.error("Error processing user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 0 * * ?", zone = TIME_ZONE)
    @Transactional
    public void resetDailyChallengesForNewDay() {
        log.info("Daily Challenge Reset Scheduler started");
        try {
            log.info("Daily Challenges reset completed for new day");
        } catch (Exception e) {
            log.error("Error resetting daily challenges: {}", e.getMessage());
        }
    }

    @Scheduled(cron = "0 0 22 * * ?", zone = TIME_ZONE)
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