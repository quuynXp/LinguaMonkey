package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import com.connectJPA.LinguaVietnameseApp.entity.DatingInvite;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import com.connectJPA.LinguaVietnameseApp.enums.DatingInviteStatus;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CoupleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DatingInviteRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserReminderRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.ReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional; -> Bỏ Transactional ở class level hoặc method cha để tránh giữ lock lâu

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderServiceImpl implements ReminderService {
    private final DatingInviteRepository inviteRepo;
    private final CoupleRepository coupleRepo;
    private final JdbcTemplate jdbcTemplate;
    private final NotificationService notificationService;
    private final UserReminderRepository reminderRepository;

    @Override
    public void runReminderJob() {
        OffsetDateTime nowTime = OffsetDateTime.now().withSecond(0).withNano(0);
        OffsetDateTime today = OffsetDateTime.now();

        expireDatingInvites();
        expireExploringCouples();
        warnExploringExpiringSoon();
        refreshLeaderboardSnapshot();

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

    private void expireDatingInvites() {
        OffsetDateTime now = OffsetDateTime.now();
        List<DatingInvite> expired = inviteRepo.findByExpiresAtBeforeAndStatus(now, DatingInviteStatus.PENDING);
        if (expired.isEmpty()) return;

        // 1. Update status
        expired.forEach(inv -> inv.setStatus(DatingInviteStatus.EXPIRED));
        // Repo.saveAll mặc định có @Transactional -> Commit ngay khi xong dòng này
        inviteRepo.saveAll(expired); 

        // 2. Gửi noti (Lúc này DB đã có status EXPIRED)
        expired.forEach(inv -> {
            try {
                sendInviteExpirationNoti(inv);
            } catch (Exception e) {
                log.error("Notify error for invite {}", inv.getInviteId(), e);
            }
        });
        log.info("Expired {} dating invites", expired.size());
    }
    
    private void sendInviteExpirationNoti(DatingInvite inv) {
         notificationService.createPushNotification(NotificationRequest.builder()
                        .userId(inv.getSenderId())
                        .title("Lời mời hẹn hò đã hết hạn")
                        .content("Lời mời hẹn hò của bạn tới " + inv.getTargetId() + " đã hết hạn.")
                        .type("DATING_INVITE_EXPIRED")
                        .build());

        notificationService.createPushNotification(NotificationRequest.builder()
                        .userId(inv.getTargetId())
                        .title("Lời mời hẹn hò đã hết hạn")
                        .content("Lời mời hẹn hò từ " + inv.getSenderId() + " đã hết hạn.")
                        .type("DATING_INVITE_EXPIRED")
                        .build());
    }

    private void expireExploringCouples() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Couple> expired = coupleRepo.findExploringExpired(CoupleStatus.EXPLORING, now);
        if (expired.isEmpty()) return;

        expired.forEach(c -> c.setStatus(CoupleStatus.EXPIRED));
        coupleRepo.saveAll(expired); // Commit Transaction ngay tại đây

        expired.forEach(c -> {
            try {
                sendCoupleExpirationNoti(c);
            } catch (Exception e) {
                log.error("Notify error for couple {}", c.getId(), e);
            }
        });
        log.info("Expired {} exploring couples", expired.size());
    }

    private void sendCoupleExpirationNoti(Couple c) {
        notificationService.createPushNotification(NotificationRequest.builder()
                .userId(c.getUser1().getUserId())
                .title("Giai đoạn tìm hiểu đã hết hạn")
                .content("Giai đoạn tìm hiểu của bạn với user " + c.getUser2().getUserId() + " đã kết thúc.")
                .type("COUPLE_EXPLORING_EXPIRED").build());
        
        notificationService.createPushNotification(NotificationRequest.builder()
                .userId(c.getUser2().getUserId())
                .title("Giai đoạn tìm hiểu đã hết hạn")
                .content("Giai đoạn tìm hiểu của bạn với user " + c.getUser1().getUserId() + " đã kết thúc.")
                .type("COUPLE_EXPLORING_EXPIRED").build());
    }


    private void warnExploringExpiringSoon() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime threshold = now.plusDays(2);
        
        List<Couple> soon = coupleRepo.findAll().stream()
                .filter(c -> c.getStatus() == CoupleStatus.EXPLORING && c.getExploringExpiresAt() != null)
                .filter(c -> !c.getExploringExpiresAt().isBefore(now) && !c.getExploringExpiresAt().isAfter(threshold))
                .toList();

        soon.forEach(c -> {
            Duration remaining = Duration.between(now, c.getExploringExpiresAt());
            long days = remaining.toDays();
            long hours = remaining.minusDays(days).toHours();
            String human = String.format("Chỉ còn %d ngày %d giờ là hết hạn tìm hiểu", days, hours);

            try {
                notificationService.createPushNotification(NotificationRequest.builder()
                        .userId(c.getUser1().getUserId())
                        .title("Giai đoạn tìm hiểu sắp hết hạn")
                        .content(human + " với " + c.getUser2().getUserId())
                        .type("COUPLE_EXPLORING_WARNING")
                        .build());

                notificationService.createPushNotification(NotificationRequest.builder()
                        .userId(c.getUser2().getUserId())
                        .title("Giai đoạn tìm hiểu sắp hết hạn")
                        .content(human + " với " + c.getUser1().getUserId())
                        .type("COUPLE_EXPLORING_WARNING")
                        .build());
            } catch (Exception e) {
                log.error("Failed to send exploring warning for couple {}", c.getId(), e);
            }
        });
        if (!soon.isEmpty()) {
            log.info("Sent exploring-expiring-soon warnings for {} couples", soon.size());
        }
    }

    private void refreshLeaderboardSnapshot() {
        try {
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot");
            log.info("Refreshed materialized view leaderboard_snapshot CONCURRENTLY");
        } catch (Exception ex) {
            log.warn("Concurrent refresh failed, falling back to non-concurrent refresh: {}", ex.getMessage());
            try {
                jdbcTemplate.execute("REFRESH MATERIALIZED VIEW leaderboard_snapshot");
                log.info("Refreshed materialized view leaderboard_snapshot");
            } catch (Exception e2) {
                log.error("Failed to refresh leaderboard_snapshot materialized view", e2);
            }
        }
    }

    private void sendNotification(UserReminder reminder) {
        NotificationRequest request = NotificationRequest.builder()
                .userId(reminder.getUserId())
                .title("Nhắc nhở của bạn")
                .content(reminder.getMessage())
                .type("USER_REMINDER")
                .build();

        notificationService.createPushNotification(request);

        log.info("🔔 Sent reminder notification for user {}: {}", reminder.getUserId(), reminder.getMessage());
    }
}