package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionDiscountRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.TransactionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommerceScheduler {

    private final TransactionRepository transactionRepository;
    private final NotificationService notificationService;
    private final CourseVersionDiscountRepository CourseVersionDiscountRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionEnrollmentRepository CourseVersionEnrollmentRepository;
    private final UserRepository userRepository;

    @Scheduled(cron = "0 0/15 * * * ?", zone = "UTC")
    @Transactional
    public void checkPendingTransactions() {
        OffsetDateTime tenMinutesAgo = OffsetDateTime.now().minusMinutes(10);
        List<Transaction> pendingTransactions = transactionRepository.findByStatusAndCreatedAtBeforeAndIsDeletedFalse(TransactionStatus.PENDING, tenMinutesAgo);
        if (pendingTransactions.isEmpty()) return;

        log.info("Checking status of {} pending transactions.", pendingTransactions.size());

        List<UUID> userIds = pendingTransactions.stream().map(Transaction::getUserId).collect(Collectors.toList());
        Map<UUID, String> userLangMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, user -> user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en"));

        for (Transaction tx : pendingTransactions) {
            String paymentStatus = "FAILED"; 
            
            String notificationKey = "";
            String type = "";
            
            if ("SUCCESS".equals(paymentStatus)) {
                tx.setStatus(TransactionStatus.valueOf("SUCCESS"));
                notificationKey = "TRANSACTION_SUCCESS";
                type = "TRANSACTION_SUCCESS";
            } else if ("FAILED".equals(paymentStatus)) {
                tx.setStatus(TransactionStatus.valueOf("FAILED"));
                notificationKey = "TRANSACTION_FAILED";
                type = "TRANSACTION_FAILED";
            } else {
                continue;
            }

            String langCode = userLangMap.getOrDefault(tx.getUserId(), "en");
            String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);

            String content = String.format(message[1], tx.getAmount(), tx.getCurrency());
            
            NotificationRequest request = NotificationRequest.builder()
                    .userId(tx.getUserId())
                    .title(message[0])
                    .content(content)
                    .type(type)
                    .payload("{\"screen\":\"PaymentStack\", \"stackScreen\":\"Wallet\"}")
                    .build();
            transactionRepository.save(tx);
            notificationService.createPushNotification(request);
        }
    }

    @Scheduled(cron = "0 0 * * * ?", zone = "UTC")
    @Transactional
    public void updateCourseStatus() {
        OffsetDateTime now = OffsetDateTime.now();

        int activated = CourseVersionDiscountRepository.activateDiscounts(now);
        if (activated > 0) log.info("Activated {} course discounts.", activated);

        int deactivated = CourseVersionDiscountRepository.deactivateDiscounts(now);
        if (deactivated > 0) log.info("Deactivated {} course discounts.", deactivated);

        List<CourseVersion> versionsToPublish = courseVersionRepository.findByStatusAndPublishedAtBeforeAndIsDeletedFalse("DRAFT", now);

        if (versionsToPublish.isEmpty()) return;

        log.info("Publishing {} new course versions.", versionsToPublish.size());

        for (CourseVersion version : versionsToPublish) {
            version.setStatus(VersionStatus.PUBLISHED);
            version.getCourse().setLatestPublicVersion(version);
            courseVersionRepository.save(version);

            List<UUID> userIds = CourseVersionEnrollmentRepository.findActiveUserIdsByCourseId(version.getCourse().getCourseId());

            if (userIds.isEmpty()) continue;
            
            log.info("Sending COURSE_UPDATE notification to {} users for courseId {}", userIds.size(), version.getCourse().getCourseId());

            Map<UUID, String> userLangMap = userRepository.findAllById(userIds).stream()
                    .collect(Collectors.toMap(User::getUserId, user -> user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en"));

            for (UUID userId : userIds) {
                String langCode = userLangMap.getOrDefault(userId, "en");
                String[] message = NotificationI18nUtil.getLocalizedMessage("COURSE_UPDATE", langCode);
                
                NotificationRequest request = NotificationRequest.builder()
                        .userId(userId)
                        .title(message[0])
                        .content(String.format(message[1], version.getCourse().getTitle()))
                        .type("COURSE_UPDATE")
                        .payload(String.format("{\"screen\":\"CourseStack\", \"stackScreen\":\"CourseDetail\", \"courseId\":\"%s\"}", version.getCourse().getCourseId()))
                        .build();
                notificationService.createPushNotification(request);
            }
        }
    }
}