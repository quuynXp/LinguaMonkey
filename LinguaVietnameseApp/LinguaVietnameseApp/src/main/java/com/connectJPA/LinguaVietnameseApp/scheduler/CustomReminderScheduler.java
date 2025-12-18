package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMemorizationRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomReminderScheduler {

    private final UserMemorizationRepository userMemorizationRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Scheduled(cron = "0 * * * * ?")
    @Transactional
    public void processNoteReminders() {
        List<UserMemorization> activeReminders = userMemorizationRepository.findByReminderEnabledTrue();

        OffsetDateTime nowUtc = OffsetDateTime.now(ZoneOffset.UTC);

        for (UserMemorization note : activeReminders) {
            try {
                if (note.getReminderTime() == null) continue;

                ZoneId userZone = getUserZoneId(note.getUserId());
                ZonedDateTime userNow = nowUtc.atZoneSameInstant(userZone);

                LocalTime reminderTime = LocalTime.parse(note.getReminderTime(), DateTimeFormatter.ofPattern("HH:mm"));

                if (userNow.getHour() == reminderTime.getHour() && userNow.getMinute() == reminderTime.getMinute()) {
                    
                    sendNotification(note);

                    if (note.getRepeatType() == RepeatType.ONCE) {
                        note.setReminderEnabled(false);
                        userMemorizationRepository.save(note);
                    }
                }
            } catch (Exception e) {
                log.error("Error processing reminder for note {}: {}", note.getMemorizationId(), e.getMessage());
            }
        }
    }

    private ZoneId getUserZoneId(UUID userId) {
        Optional<User> user = userRepository.findByUserIdAndIsDeletedFalse(userId);
        if (user.isPresent() && user.get().getCountry() != null) {
            return mapCountryToZoneId(user.get().getCountry());
        }
        return ZoneId.of("Asia/Ho_Chi_Minh");
    }

    private ZoneId mapCountryToZoneId(Country country) {
        switch (country) {
            case VIETNAM: return ZoneId.of("Asia/Ho_Chi_Minh");
            case JAPAN: return ZoneId.of("Asia/Tokyo");
            case KOREA: return ZoneId.of("Asia/Seoul");
            case CHINA: return ZoneId.of("Asia/Shanghai");
            case UNITED_STATES: return ZoneId.of("America/New_York"); // Simplified, usually requires state
            default: return ZoneId.of("UTC");
        }
    }

    private void sendNotification(UserMemorization note) {
        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(note.getUserId())
                .title(note.getReminderTitle() != null ? note.getReminderTitle() : "Time to review notes!")
                .content("Review: " + note.getNoteText())
                .type("NOTE_REMINDER")
                .payload(String.format("{\"screen\":\"Notes\", \"noteId\":\"%s\"}", note.getMemorizationId()))
                .build();

        notificationService.createPushNotification(notificationRequest);
    }
}