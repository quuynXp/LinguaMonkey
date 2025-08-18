package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.PaymentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TransactionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.WebhookRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface TransactionService {
    Page<TransactionResponse> getAllTransactions(String userId, String status, Pageable pageable);
    TransactionResponse getTransactionById(UUID id);
    TransactionResponse createTransaction(TransactionRequest request);
    TransactionResponse updateTransaction(UUID id, TransactionRequest request);
    void deleteTransaction(UUID id);
    String createPaymentUrl(PaymentRequest request);
    String handleWebhook(WebhookRequest request);
}