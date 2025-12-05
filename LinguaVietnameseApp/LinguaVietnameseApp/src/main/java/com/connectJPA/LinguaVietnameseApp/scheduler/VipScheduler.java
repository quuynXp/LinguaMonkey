package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
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

    // 09:00 VN = 02:00 UTC
    // 15:00 VN = 08:00 UTC
    // 20:00 VN = 13:00 UTC
    @Scheduled(cron = "0 0 2,8,13 * * *", zone = "UTC")
    @Transactional
    public void checkAndNotifyExpiringVip() {
        log.info("Starting VIP expiration check...");

        LocalDate tomorrow = LocalDate.now().plusDays(1);
        OffsetDateTime startOfTomorrow = OffsetDateTime.of(LocalDateTime.of(tomorrow, LocalTime.MIN), ZoneOffset.UTC);
        OffsetDateTime endOfTomorrow = OffsetDateTime.of(LocalDateTime.of(tomorrow, LocalTime.MAX), ZoneOffset.UTC);

        List<User> expiringUsers = userRepository.findByVipExpirationDateBetween(startOfTomorrow, endOfTomorrow);

        for (User user : expiringUsers) {
            if (user.isDeleted() || !user.getUserSettings().isVipReminders()) continue;

            try {
                if (user.getVipExpirationDate().isBefore(endOfTomorrow.plusDays(1))) {
                    sendVipExpirationReminder(user);
                }
            } catch (Exception e) {
                log.error("Failed to send VIP reminder to user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }

    private void sendVipExpirationReminder(User user) {
        String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
        String[] messages = NotificationI18nUtil.getLocalizedMessage("VIP_EXPIRATION_WARNING", langCode);

        NotificationRequest notification = NotificationRequest.builder()
                .userId(user.getUserId())
                .title(messages[0])
                .content(messages[1])
                .type("VIP_EXPIRATION_WARNING")
                .payload("{\"screen\":\"PaymentStack\", \"stackScreen\":\"VipSubscription\"}")
                .build();

        notificationService.createPushNotification(notification);
        log.info("Sent VIP expiration reminder to user {}", user.getUserId());
    }
}