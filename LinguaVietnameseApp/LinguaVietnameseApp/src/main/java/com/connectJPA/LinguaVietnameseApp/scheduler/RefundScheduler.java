package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.TransactionRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import com.connectJPA.LinguaVietnameseApp.service.WalletService;

import learning.RefundDecisionResponse;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class RefundScheduler {

    private final TransactionRepository transactionRepository;
    private final GrpcClientService grpcClientService;
    private final WalletService walletService;
    private final NotificationService notificationService;
    private final AuthenticationService authenticationService;

    // Fast Track: Runs every 5 minutes for Standard Reasons (Dropdown selected)
    @Scheduled(cron = "0 0/5 * * * ?") 
    @Transactional
    public void processFastTrackRefunds() {
        log.info("Starting VIP/Fast Track Refund Analysis...");
        processRefunds(true);
    }

    // Standard Track: Runs every 10 minutes for "Other" (Complex text analysis)
    @Scheduled(cron = "0 0/10 * * * ?")
    @Transactional
    public void processComplexRefunds() {
        log.info("Starting Standard AI Refund Analysis...");
        processRefunds(false);
    }

    private void processRefunds(boolean isFastTrack) {
        List<Transaction> pendingRefunds = transactionRepository.findByTypeAndStatus(
                TransactionType.REFUND, 
                TransactionStatus.PENDING
        );

        if (pendingRefunds.isEmpty()) return;

        String systemToken = authenticationService.generateSystemToken(); 

        List<Transaction> filteredRefunds = pendingRefunds.stream()
            .filter(tx -> isFastTrack ? isStandardReason(tx.getDescription()) : !isStandardReason(tx.getDescription()))
            .collect(Collectors.toList());

        for (Transaction refundTx : filteredRefunds) {
            try {
                processSingleRefund(refundTx, systemToken);
            } catch (Exception e) {
                log.error("Failed to process refund tx: {}", refundTx.getTransactionId(), e);
            }
        }
    }

    private boolean isStandardReason(String description) {
        // Frontend sends standard reasons prefixed with [STD] or specific codes
        return description != null && (
            description.startsWith("[ACCIDENTAL_PURCHASE]") ||
            description.startsWith("[CONTENT_MISMATCH]") ||
            description.startsWith("[TECHNICAL_ISSUE]")
        );
    }

    private void processSingleRefund(Transaction refundTx, String token) {
        Transaction originalTx = refundTx.getOriginalTransaction();
        String courseId = "N/A";
        
        CompletableFuture<RefundDecisionResponse> future = grpcClientService.callRefundDecisionAsync(
            token,
            refundTx.getTransactionId().toString(),
            refundTx.getUser().getUserId().toString(), 
            courseId, 
            refundTx.getDescription()
        );

        future.thenAccept(response -> {
            String decision = response.getDecision();
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
            markForAdminReview(refundTx);
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
        originalTx.setStatus(TransactionStatus.SUCCESS);
        
        saveAndNotify(refundTx, originalTx, "REFUND_REJECTED", "Refund rejected. Reason: Policy Violation.");
    }

    private void markForAdminReview(Transaction refundTx) {
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