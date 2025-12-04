package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.response.RefundDecisionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.TransactionRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import com.connectJPA.LinguaVietnameseApp.service.WalletService;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.config.JwtService; 
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class RefundScheduler {

    private final TransactionRepository transactionRepository;
    private final GrpcClientService grpcClientService;
    private final WalletService walletService;
    private final NotificationService notificationService;
    private final AuthenticationService authenticationService; // To generate system token for gRPC

    @Scheduled(cron = "0 0/10 * * * ?") // Run every 10 minutes
    @Transactional
    public void processSmartRefunds() {
        log.info("Starting AI Refund Analysis...");

        // 1. Get Pending Refunds (NOT PENDING_REVIEW yet)
        List<Transaction> pendingRefunds = transactionRepository.findByTypeAndStatus(
                TransactionType.REFUND, 
                TransactionStatus.PENDING
        );

        if (pendingRefunds.isEmpty()) return;

        // Generate a system token for internal gRPC calls
        String systemToken = authenticationService.generateToken(); 

        for (Transaction refundTx : pendingRefunds) {
            try {
                processSingleRefund(refundTx, systemToken);
            } catch (Exception e) {
                log.error("Failed to process refund tx: {}", refundTx.getTransactionId(), e);
            }
        }
    }

    private void processSingleRefund(Transaction refundTx, String token) {
        Transaction originalTx = refundTx.getOriginalTransaction();
        String courseId = "N/A"; // Extract course ID from description or metadata if available
        
        // Call Python Gemini Service
        CompletableFuture<RefundDecisionResponse> future = grpcClientService.callRefundDecisionAsync(
            token,
            refundTx.getTransactionId().toString(),
            refundTx.getUser().getUserId().toString(),
            courseId,
            refundTx.getDescription() // The reason text
        );

        future.thenAccept(response -> {
            String decision = response.getDecision(); // APPROVE, REJECT, REVIEW
            float confidence = response.getConfidence();

            log.info("AI Decision for TX {}: {} (Confidence: {})", refundTx.getTransactionId(), decision, confidence);

            if ("APPROVE".equals(decision) && confidence > 0.85) {
                autoApprove(refundTx, originalTx);
            } else if ("REJECT".equals(decision) && confidence > 0.90) {
                autoReject(refundTx, originalTx, response.getExplanationsList().toString());
            } else {
                markForAdminReview(refundTx);
            }
        }).exceptionally(ex -> {
            log.error("gRPC Error: ", ex);
            markForAdminReview(refundTx); // Fallback to human
            return null;
        });
    }

    private void autoApprove(Transaction refundTx, Transaction originalTx) {
        walletService.debit(refundTx.getSender().getUserId(), refundTx.getAmount());
        walletService.credit(refundTx.getReceiver().getUserId(), refundTx.getAmount());
        
        refundTx.setStatus(TransactionStatus.SUCCESS);
        originalTx.setStatus(TransactionStatus.REFUNDED);
        
        saveAndNotify(refundTx, originalTx, "REFUND_APPROVED", "Your refund has been automatically approved.");
    }

    private void autoReject(Transaction refundTx, Transaction originalTx, String reason) {
        refundTx.setStatus(TransactionStatus.REJECTED);
        originalTx.setStatus(TransactionStatus.SUCCESS); // Revert to success
        
        saveAndNotify(refundTx, originalTx, "REFUND_REJECTED", "Refund rejected. Reason: Policy Violation.");
    }

    private void markForAdminReview(Transaction refundTx) {
        // Change status to PENDING_REVIEW so Admin UI can see it, and Scheduler skips it next time
        refundTx.setStatus(TransactionStatus.PENDING_REVIEW);
        transactionRepository.save(refundTx);
    }

    private void saveAndNotify(Transaction refundTx, Transaction originalTx, String type, String msg) {
        transactionRepository.save(refundTx);
        transactionRepository.save(originalTx);

        notificationService.createPushNotification(NotificationRequest.builder()
            .userId(refundTx.getUser().getUserId())
            .title("Refund Update")
            .content(msg)
            .type(type)
            .build());
    }
}