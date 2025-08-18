package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.repository.UserReminderRepository;
import com.connectJPA.LinguaVietnameseApp.service.ReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderServiceImpl implements ReminderService {

    private final UserReminderRepository reminderRepository;

    @Override
    @Transactional
    public void runReminderJob() {
        OffsetDateTime nowTime = OffsetDateTime.now().withSecond(0).withNano(0);
        OffsetDateTime today = OffsetDateTime.now();

        log.info("[ReminderService] Checking reminders for {} at {}", today, nowTime);

        List<UserReminder> reminders = reminderRepository.findByEnabledTrueAndReminderTime(nowTime);

        for (UserReminder reminder : reminders) {
            if (shouldTrigger(reminder, today)) {
                sendNotification(reminder);
            }
        }
    }

    private boolean shouldTrigger(UserReminder reminder, OffsetDateTime today) {
        return switch (reminder.getRepeatType().toString()) {
            case "DAILY" -> true;
            case "ONCE" -> today.toLocalDate().equals(reminder.getReminderDate());
            case "WEEKLY" -> reminder.getReminderDate() != null
                    && reminder.getReminderDate().getDayOfWeek() == today.getDayOfWeek();
            default -> false;
        };
    }

    private void sendNotification(UserReminder reminder) {
        // TODO: Gửi Email, Push Notification, hoặc lưu vào Firestore
        log.info("🔔 Reminder for user {}: {}", reminder.getUserId(), reminder.getMessage());
    }
}
