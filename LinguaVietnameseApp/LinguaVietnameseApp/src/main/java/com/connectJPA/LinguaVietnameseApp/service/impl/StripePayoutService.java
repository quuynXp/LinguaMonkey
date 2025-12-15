package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.PayoutService;
import com.stripe.Stripe;
import com.stripe.model.Transfer;
import com.stripe.param.TransferCreateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class StripePayoutService implements PayoutService {

    @Value("${stripe.api-key}")
    private String stripeApiKey;

    @Override
    public String executePayout(Transaction transaction) {
        Stripe.apiKey = stripeApiKey;

        try {
            long amountInCents = transaction.getAmount().multiply(BigDecimal.valueOf(100)).longValue();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("transactionId", transaction.getTransactionId().toString());
            metadata.put("userId", transaction.getUser().getUserId().toString());
            metadata.put("email", transaction.getUser().getEmail());

            if (transaction.getDescription() != null && transaction.getDescription().contains("acct_")) {
                 String destinationAccountId = extractAccountId(transaction.getDescription());
                 
                 TransferCreateParams params = TransferCreateParams.builder()
                        .setAmount(amountInCents)
                        .setCurrency(transaction.getCurrency().toLowerCase())
                        .setDestination(destinationAccountId) 
                        .putAllMetadata(metadata)
                        .setDescription("Payout for Tx: " + transaction.getTransactionId())
                        .build();

                 Transfer transfer = Transfer.create(params);
                 log.info("Stripe Transfer created successfully: {}", transfer.getId());
                 return transfer.getId();
            } else {
                 log.info("Simulating Stripe Transfer (No Destination Account ID found). Amount: {}", amountInCents);
                 return "tr_simulated_" + System.currentTimeMillis();
            }

        } catch (Exception e) {
            log.error("Stripe Payout Failed", e);
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED); 
        }
    }

    private String extractAccountId(String description) {
        int index = description.indexOf("acct_");
        if (index != -1) {
            int end = description.indexOf(" ", index);
            if (end == -1) end = description.length();
            return description.substring(index, end);
        }
        return null;
    }
}