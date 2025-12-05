package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserReminderRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.UserReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomReminderScheduler {

    private final UserReminderRepository userReminderRepository;
    private final NotificationService notificationService;
    private final UserReminderService userReminderService; // To reuse delete logic if needed

    private final ZoneOffset APP_ZONE_OFFSET = ZoneOffset.ofHours(7); // VN Time

    /**
     * Runs every minute to check for reminders scheduled for the current time.
     * The Frontend already converted User Time -> VN Time (UTC+7).
     * This scheduler compares Server Time (VN) with the Database Time.
     */
    @Scheduled(cron = "0 * * * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void processCustomReminders() {
        OffsetDateTime now = OffsetDateTime.now(APP_ZONE_OFFSET).truncatedTo(ChronoUnit.MINUTES);
        OffsetDateTime oneMinuteLater = now.plusMinutes(1);

        // Find reminders falling exactly in this minute window
        List<UserReminder> dueReminders = userReminderRepository.findDueReminders(now, oneMinuteLater);

        if (dueReminders.isEmpty()) {
            return;
        }

        log.info("Found {} due reminders at {}", dueReminders.size(), now);

        for (UserReminder reminder : dueReminders) {
            try {
                sendNotification(reminder);

                // Handle Post-Notification Logic (Disable ONCE reminders)
                if (reminder.getRepeatType() == RepeatType.ONCE) {
                    reminder.setEnabled(false);
                    userReminderRepository.save(reminder);
                }

            } catch (Exception e) {
                log.error("Failed to process reminder ID {}: {}", reminder.getId(), e.getMessage());
            }
        }
    }

    private void sendNotification(UserReminder reminder) {
        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(reminder.getUserId())
                .title(reminder.getTitle())
                .content(reminder.getMessage())
                .type("CUSTOM_REMINDER")
                // Navigates to the note detail or list
                .payload(String.format("{\"screen\":\"Notes\", \"targetId\":\"%s\"}", reminder.getTargetId())) 
                .build();

        notificationService.createPushNotification(notificationRequest);
    }
}