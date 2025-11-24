package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseDiscountRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.TransactionRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
// import com.connectJPA.LinguaVietnameseApp.service.PaymentGatewayService; // Giả định bạn có service này
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommerceScheduler {

    private final TransactionRepository transactionRepository;
    private final NotificationService notificationService;
    private final CourseDiscountRepository courseDiscountRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;

    // private final PaymentGatewayService paymentGatewayService; // (Giả định)

    /**
     * Chạy mỗi 15 phút để kiểm tra lại các giao dịch "PENDING".
     */
    @Scheduled(cron = "0 0/15 * * * ?") // 15 phút một lần
    @Transactional
    public void checkPendingTransactions() {
        // Kiểm tra các giao dịch PENDING được tạo hơn 10 phút trước
        OffsetDateTime tenMinutesAgo = OffsetDateTime.now().minusMinutes(10);
        List<Transaction> pendingTransactions = transactionRepository.findByStatusAndCreatedAtBeforeAndIsDeletedFalse(TransactionStatus.PENDING, tenMinutesAgo);
        if (pendingTransactions.isEmpty()) return;

        log.info("Checking status of {} pending transactions.", pendingTransactions.size());

        for (Transaction tx : pendingTransactions) {
            // **Giả định logic nghiệp vụ:**
            // Bạn cần một service (ví dụ: PaymentGatewayService) để gọi API của VNPAY/Momo
            // để kiểm tra lại trạng thái của giao dịch bằng idempotency_key hoặc payment_gateway_transaction_id

            // String paymentStatus = paymentGatewayService.checkTransaction(tx.getIdempotencyKey());
            String paymentStatus = "FAILED"; // (Giả lập là FAILED)

            if ("SUCCESS".equals(paymentStatus)) {
                tx.setStatus(TransactionStatus.valueOf("SUCCESS"));
                // (Thêm logic nghiệp vụ: cộng tiền vào ví, kích hoạt khóa học...)

                NotificationRequest request = NotificationRequest.builder()
                        .userId(tx.getUserId())
                        .title("Transaction Successful")
                        .content("Your payment of " + tx.getAmount() + " " + tx.getCurrency() + " was successful.")
                        .type("TRANSACTION_SUCCESS")
                        .payload("{\"screen\":\"Wallet\"}")
                        .build();
                notificationService.createPushNotification(request);

            } else if ("FAILED".equals(paymentStatus)) {
                tx.setStatus(TransactionStatus.valueOf("FAILED"));
                NotificationRequest request = NotificationRequest.builder()
                        .userId(tx.getUserId())
                        .title("Transaction Failed")
                        .content("Your payment of " + tx.getAmount() + " " + tx.getCurrency() + " failed.")
                        .type("TRANSACTION_FAILED")
                        .payload("{\"screen\":\"Wallet\"}")
                        .build();
                notificationService.createPushNotification(request);
            }
            transactionRepository.save(tx);
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

            log.info("Sending COURSE_UPDATE notification to {} users for courseId {}", userIds.size(), version.getCourse().getCourseId());

            for (UUID userId : userIds) {
                NotificationRequest request = NotificationRequest.builder()
                        .userId(userId)
                        .title("Course Updated!")
                        .content("A course you are enrolled in (" + version.getCourse().getTitle() + ") has a new version.")
                        .type("COURSE_UPDATE")
                        .payload(String.format("{\"screen\":\"CourseDetail\", \"courseId\":\"%s\"}", version.getCourse().getCourseId()))
                        .build();
                notificationService.createPushNotification(request);
            }
        }
    }
}