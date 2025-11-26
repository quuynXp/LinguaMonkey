package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FlashcardRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserReminderRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class LearningContentScheduler {

    private final UserReminderRepository userReminderRepository;
    private final NotificationService notificationService;
    private final FlashcardRepository flashcardRepository;
    private final UserRepository userRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;

    /**
     * Chạy mỗi phút để kiểm tra các nhắc nhở do người dùng tự tạo.
     */
    @Scheduled(cron = "0 * * * * ?") // Mỗi phút
    @Transactional
    public void processUserCustomReminders() {
        OffsetDateTime now = OffsetDateTime.now();
        List<UserReminder> reminders = userReminderRepository.findByReminderTimeBeforeAndEnabledTrueAndIsDeletedFalse(now);

        if (reminders.isEmpty()) return;

        log.info("Processing {} user reminders.", reminders.size());

        for (UserReminder reminder : reminders) {
            NotificationRequest request = NotificationRequest.builder()
                    .userId(reminder.getUserId())
                    .title(reminder.getTitle())
                    .content(reminder.getMessage())
                    .type("USER_REMINDER")
                    .payload(String.format("{\"screen\":\"ReminderDetail\", \"targetId\":\"%s\"}", reminder.getTargetId()))
                    .build();

            notificationService.createPushNotification(request);

            if (reminder.getRepeatType() == null || "none".equalsIgnoreCase(String.valueOf(reminder.getRepeatType()))) {
                reminder.setEnabled(false);
            } else {
                String repeatType = String.valueOf(reminder.getRepeatType()).toLowerCase();
                OffsetDateTime nextTime = reminder.getReminderTime();

                while (nextTime.isBefore(now) || nextTime.isEqual(now)) {
                    switch (repeatType) {
                        case "daily":
                            nextTime = nextTime.plus(1, ChronoUnit.DAYS);
                            break;
                        case "weekly":
                            nextTime = nextTime.plus(7, ChronoUnit.DAYS);
                            break;
                        case "monthly":
                            nextTime = nextTime.plus(1, ChronoUnit.MONTHS);
                            break;
                        default:
                            nextTime = null;
                            break;
                    }
                    if (nextTime == null) {
                        reminder.setEnabled(false);
                        break;
                    }
                }

                if (nextTime != null) {
                    reminder.setReminderTime(nextTime);
                }
            }
        }
        userReminderRepository.saveAll(reminders);
    }

    /**
     * Chạy hàng giờ để nhắc nhở học Flashcard (Spaced Repetition).
     */
    @Scheduled(cron = "0 0 * * * ?") // Mỗi giờ
    @Transactional(readOnly = true)
    public void sendFlashcardReminders() {
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> userIds = flashcardRepository.findUserIdsWithPendingReviews(now);

        if (userIds.isEmpty()) return;

        log.info("Sending flashcard reminders to {} users.", userIds.size());

        // Lấy thông tin ngôn ngữ của tất cả người dùng liên quan
        List<User> users = userRepository.findAllById(userIds);
        
        for (User user : users) {
            String langCode = user.getNativeLanguageCode();
            String[] message = NotificationI18nUtil.getLocalizedMessage("FLASHCARD_REMINDER", langCode);

            NotificationRequest request = NotificationRequest.builder()
                    .userId(user.getUserId())
                    .title(message[0])
                    .content(message[1])
                    .type("FLASHCARD_REMINDER")
                    .payload("{\"screen\":\"Learn\", \"stackScreen\":\"FlashcardDeck\"}")
                    .build();
            notificationService.createPushNotification(request);
        }
    }

    /**
     * Chạy mỗi ngày lúc 1 giờ sáng để gán Thử thách hàng ngày mới.
     */
    @Scheduled(cron = "0 0 1 * * ?") // 1:00 AM hàng ngày
    @Transactional
    public void assignDailyChallenges() {
        final int CHALLENGE_COUNT = 3; // Gán 3 thử thách mỗi ngày
        List<User> users = userRepository.findAllByIsDeletedFalse();
        List<DailyChallenge> challenges = dailyChallengeRepository.findRandomChallenges(CHALLENGE_COUNT);

        if (challenges.isEmpty() || users.isEmpty()) {
            log.warn("No challenges or users found for daily assignment.");
            return;
        }

        log.info("Assigning {} daily challenges to {} users.", challenges.size(), users.size());
        List<UserDailyChallenge> newAssignments = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (User user : users) {
            int stack = 1;
            for (DailyChallenge challenge : challenges) {
                UserDailyChallenge assignment = new UserDailyChallenge(
                        user.getUserId(),
                        challenge.getId(),
                        today,
                        stack++,
                        challenge.getBaseExp(),
                        false,
                        challenge.getRewardCoins(),
                        0
                );
                newAssignments.add(assignment);
            }

            // Gửi thông báo i18n
            String langCode = user.getNativeLanguageCode();
            String[] message = NotificationI18nUtil.getLocalizedMessage("DAILY_CHALLENGE", langCode);

            NotificationRequest request = NotificationRequest.builder()
                    .userId(user.getUserId())
                    .title(message[0])
                    .content(String.format(message[1], challenges.size()))
                    .type("DAILY_CHALLENGE")
                    .payload("{\"screen\":\"Home\", \"tab\":\"Challenges\"}")
                    .build();
            notificationService.createPushNotification(request);
        }

        userDailyChallengeRepository.saveAll(newAssignments);
    }
}