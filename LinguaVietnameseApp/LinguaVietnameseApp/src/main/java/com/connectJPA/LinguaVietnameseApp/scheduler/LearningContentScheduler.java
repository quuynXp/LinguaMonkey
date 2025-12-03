package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FlashcardRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserReminderRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
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

    @Scheduled(cron = "0 * * * * ?")
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
                    .payload("{\"screen\":\"NotificationsScreen\"}")
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

    // @Scheduled(cron = "0 0 * * * ?", zone = "UTC")
    // @Transactional(readOnly = true)
    // public void sendFlashcardReminders() {
    //     OffsetDateTime now = OffsetDateTime.now();
    //     List<UUID> userIds = flashcardRepository.findUserIdsWithPendingReviews(now);

    //     if (userIds.isEmpty()) return;

    //     log.info("Sending flashcard reminders to {} users.", userIds.size());

    //     List<User> users = userRepository.findAllById(userIds);
        
    //     for (User user : users) {
    //         String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
    //         String[] message = NotificationI18nUtil.getLocalizedMessage("FLASHCARD_REMINDER", langCode);

    //         NotificationRequest request = NotificationRequest.builder()
    //                 .userId(user.getUserId())
    //                 .title(message[0])
    //                 .content(message[1])
    //                 .type("FLASHCARD_REMINDER")
    //                 .payload("{\"screen\":\"Learn\"}")
    //                 .build();
    //         notificationService.createPushNotification(request);
    //     }
    // }
}