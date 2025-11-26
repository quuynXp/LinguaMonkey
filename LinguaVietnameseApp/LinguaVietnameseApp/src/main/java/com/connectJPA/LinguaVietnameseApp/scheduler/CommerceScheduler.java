package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseDiscountRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseEnrollmentRepository;
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
    private final CourseDiscountRepository courseDiscountRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final UserRepository userRepository;

    /**
     * Chạy mỗi 15 phút để kiểm tra lại các giao dịch "PENDING".
     */
    @Scheduled(cron = "0 0/15 * * * ?") // 15 phút một lần
    @Transactional
    public void checkPendingTransactions() {
        OffsetDateTime tenMinutesAgo = OffsetDateTime.now().minusMinutes(10);
        List<Transaction> pendingTransactions = transactionRepository.findByStatusAndCreatedAtBeforeAndIsDeletedFalse(TransactionStatus.PENDING, tenMinutesAgo);
        if (pendingTransactions.isEmpty()) return;

        log.info("Checking status of {} pending transactions.", pendingTransactions.size());

        List<UUID> userIds = pendingTransactions.stream().map(Transaction::getUserId).collect(Collectors.toList());
        Map<UUID, String> userLangMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, User::getNativeLanguageCode));

        for (Transaction tx : pendingTransactions) {
            String paymentStatus = "FAILED";
            String langCode = userLangMap.getOrDefault(tx.getUserId(), "en");

            String title;
            String content;
            String type;

            if ("SUCCESS".equals(paymentStatus)) {
                tx.setStatus(TransactionStatus.valueOf("SUCCESS"));
                // (Thêm logic nghiệp vụ: cộng tiền vào ví, kích hoạt khóa học...)

                title = "Transaction Successful";
                content = "Your payment of " + tx.getAmount() + " " + tx.getCurrency() + " was successful.";
                type = "TRANSACTION_SUCCESS";

            } else if ("FAILED".equals(paymentStatus)) {
                tx.setStatus(TransactionStatus.valueOf("FAILED"));
                
                title = "Transaction Failed";
                content = "Your payment of " + tx.getAmount() + " " + tx.getCurrency() + " failed.";
                type = "TRANSACTION_FAILED";
            } else {
                continue; // Chưa xử lý nếu vẫn PENDING hoặc status khác
            }
            
            // Chú ý: Ở đây ta KHÔNG dùng NotificationI18nUtil vì nội dung có chứa amount và currency
            // -> Cần một MessageSource hoặc logic i18n phức tạp hơn để xử lý format số và chuỗi.
            // Tạm thời giữ nguyên để tránh việc tạo logic quá phức tạp cho ví dụ này, 
            // nhưng nên lưu ý rằng các chuỗi này cần được dịch trong thực tế.

            NotificationRequest request = NotificationRequest.builder()
                    .userId(tx.getUserId())
                    .title(title)
                    .content(content)
                    .type(type)
                    .payload("{\"screen\":\"Wallet\"}")
                    .build();
            transactionRepository.save(tx);
            notificationService.createPushNotification(request);
        }
    }

    /**
     * Chạy mỗi giờ để cập nhật trạng thái các khóa học.
     */
    @Scheduled(cron = "0 0 * * * ?") // Mỗi giờ
    @Transactional
    public void updateCourseStatus() {
        OffsetDateTime now = OffsetDateTime.now();

        int activated = courseDiscountRepository.activateDiscounts(now);
        if (activated > 0) log.info("Activated {} course discounts.", activated);

        int deactivated = courseDiscountRepository.deactivateDiscounts(now);
        if (deactivated > 0) log.info("Deactivated {} course discounts.", deactivated);

        List<CourseVersion> versionsToPublish = courseVersionRepository.findByStatusAndPublishedAtBeforeAndIsDeletedFalse("DRAFT", now);

        if (versionsToPublish.isEmpty()) return;

        log.info("Publishing {} new course versions.", versionsToPublish.size());

        for (CourseVersion version : versionsToPublish) {
            version.setStatus(VersionStatus.PUBLISHED);
            version.getCourse().setLatestPublicVersion(version);
            courseVersionRepository.save(version);

            List<UUID> userIds = courseEnrollmentRepository.findActiveUserIdsByCourseId(version.getCourse().getCourseId());

            if (userIds.isEmpty()) continue;
            
            log.info("Sending COURSE_UPDATE notification to {} users for courseId {}", userIds.size(), version.getCourse().getCourseId());

            // Lấy thông tin ngôn ngữ của người dùng
            Map<UUID, String> userLangMap = userRepository.findAllById(userIds).stream()
                    .collect(Collectors.toMap(User::getUserId, User::getNativeLanguageCode));

            for (UUID userId : userIds) {
                String langCode = userLangMap.getOrDefault(userId, "en");
                String[] message = NotificationI18nUtil.getLocalizedMessage("COURSE_UPDATE", langCode);
                
                NotificationRequest request = NotificationRequest.builder()
                        .userId(userId)
                        .title(message[0])
                        .content(String.format(message[1], version.getCourse().getTitle()))
                        .type("COURSE_UPDATE")
                        .payload(String.format("{\"screen\":\"CourseDetail\", \"courseId\":\"%s\"}", version.getCourse().getCourseId()))
                        .build();
                notificationService.createPushNotification(request);
            }
        }
    }
}