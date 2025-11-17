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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

            // Xử lý nhắc nhở
            if (reminder.getRepeatType() == null || "none".equalsIgnoreCase(String.valueOf(reminder.getRepeatType()))) {
                reminder.setEnabled(false); // Tắt nếu không lặp lại
            } else {
                // TODO: Thêm logic lặp lại (ví dụ: cộng thêm 1 ngày/1 tuần vào reminder_time)
                // Ví dụ: if ("daily".equals..._
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

        for (UUID userId : userIds) {
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("Flashcard Review")
                    .content("You have flashcards ready for review!")
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
                // Tạo bản ghi UserDailyChallenge mới
                // Giả định constructor (bạn cần tạo entity này)
                UserDailyChallenge assignment = new UserDailyChallenge(
                        user.getUserId(),
                        challenge.getId(),
                        today, // Dùng assigned_date (LocalDate)
                        stack++,
                        challenge.getBaseExp(),
                        false, // is_completed
                        challenge.getRewardCoins(),
                        0 // progress
                );
                newAssignments.add(assignment);
            }

            // Gửi một thông báo cho mỗi user
            NotificationRequest request = NotificationRequest.builder()
                    .userId(user.getUserId())
                    .title("New Daily Challenges!")
                    .content("Your " + challenges.size() + " new daily challenges are available. Check them out!")
                    .type("DAILY_CHALLENGE")
                    .payload("{\"screen\":\"Home\", \"tab\":\"Challenges\"}")
                    .build();
            notificationService.createPushNotification(request);
        }

        // Lưu tất cả vào DB một lần
        userDailyChallengeRepository.saveAll(newAssignments);
    }
}