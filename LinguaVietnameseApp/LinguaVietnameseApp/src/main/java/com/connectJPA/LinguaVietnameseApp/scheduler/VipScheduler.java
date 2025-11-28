package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class VipScheduler {

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // Run at 9:00 AM, 3:00 PM, and 8:00 PM
    @Scheduled(cron = "0 0 9 * * *")
    @Scheduled(cron = "0 0 15 * * *")
    @Scheduled(cron = "0 0 20 * * *")
    @Transactional
    public void checkAndNotifyExpiringVip() {
        log.info("Starting VIP expiration check...");

        // Calculate "Tomorrow" range to find users who have 1 day left (Day 13)
        // If today is Day 13, expiration is Day 14. 
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        OffsetDateTime startOfTomorrow = OffsetDateTime.of(LocalDateTime.of(tomorrow, LocalTime.MIN), ZoneOffset.UTC);
        OffsetDateTime endOfTomorrow = OffsetDateTime.of(LocalDateTime.of(tomorrow, LocalTime.MAX), ZoneOffset.UTC);

        List<User> expiringUsers = userRepository.findByVipExpirationDateBetween(startOfTomorrow, endOfTomorrow);

        for (User user : expiringUsers) {
            try {
                // Double check if they haven't extended (expiry is still tomorrow)
                if (user.getVipExpirationDate().isBefore(endOfTomorrow.plusDays(1))) {
                    sendVipExpirationReminder(user);
                }
            } catch (Exception e) {
                log.error("Failed to send VIP reminder to user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }

    private void sendVipExpirationReminder(User user) {
        NotificationRequest notification = NotificationRequest.builder()
                .userId(user.getUserId())
                .title("⚠️ VIP Trial Ending Soon!")
                .content("Your VIP privileges will expire in 24 hours. Subscribe now to keep learning without interruption!")
                .type("VIP_EXPIRATION_WARNING")
                .payload("{\"screen\":\"VipSubscription\"}")
                .build();

        notificationService.createPushNotification(notification);
        // Assuming createNotification also handles in-app persistence
        notificationService.createNotification(notification); 
        
        log.info("Sent VIP expiration reminder to user {}", user.getUserId());
    }
}