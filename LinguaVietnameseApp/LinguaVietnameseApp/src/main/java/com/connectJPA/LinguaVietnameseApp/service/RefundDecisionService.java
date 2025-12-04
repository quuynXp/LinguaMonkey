package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class RefundDecisionService {

    // Keywords identifying User Error (Reject these)
    private static final List<String> USER_ERROR_KEYWORDS = Arrays.asList(
            "mistake", "wrong course", "changed mind", "don't need", "accidental", "expensive", "bought by mistake"
    );

    // Keywords identifying Creator/Content Error (Approve these)
    private static final List<String> CREATOR_ERROR_KEYWORDS = Arrays.asList(
            "scam", "empty", "no audio", "video broken", "wrong content", "fake", "quality", "doesn't work"
    );

    /**
     * Analyzes the refund reason and determines the next status.
     * @param transaction The refund transaction request
     * @return The suggested status (REJECTED, SUCCESS, or PENDING_REVIEW)
     */
    public TransactionStatus analyzeRefundRequest(Transaction transaction) {
        String reason = transaction.getDescription() != null ? transaction.getDescription().toLowerCase() : "";
        
        log.info("Analyzing refund request ID: {} with reason: {}", transaction.getTransactionId(), reason);

        // 1. Check for User Error -> Auto Reject
        boolean isUserError = USER_ERROR_KEYWORDS.stream().anyMatch(reason::contains);
        if (isUserError) {
            log.info("Decision: Auto-REJECT (User Error)");
            return TransactionStatus.REJECTED;
        }

        // 2. Check for Creator/System Error -> Auto Approve
        boolean isCreatorError = CREATOR_ERROR_KEYWORDS.stream().anyMatch(reason::contains);
        if (isCreatorError) {
            log.info("Decision: Auto-APPROVE (Content Error)");
            return TransactionStatus.SUCCESS;
        }

        // 3. Ambiguous / System Types -> Admin Review
        log.info("Decision: Flag for Admin Review");
        return TransactionStatus.PENDING_REVIEW;
    }
}