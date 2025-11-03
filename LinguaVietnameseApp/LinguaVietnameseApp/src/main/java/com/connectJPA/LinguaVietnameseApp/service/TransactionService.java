package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface TransactionService {
    Page<TransactionResponse> getAllTransactions(UUID userId, String status, Pageable pageable);
    TransactionResponse getTransactionById(UUID id);
    TransactionResponse createTransaction(TransactionRequest request);
    TransactionResponse updateTransaction(UUID id, TransactionRequest request);
    void deleteTransaction(UUID id);
    String createPaymentUrl(PaymentRequest request);
    String handleWebhook(WebhookRequest request);
    String createDepositUrl(DepositRequest request);
    TransactionResponse withdraw(WithdrawRequest request);

    // Luồng P2P
    TransactionResponse transfer(TransferRequest request);

    // Luồng Hoàn tiền
    TransactionResponse requestRefund(RefundRequest request);
    TransactionResponse approveRefund(ApproveRefundRequest request);
    TransactionResponse rejectRefund(UUID refundTransactionId, UUID adminId, String reason);

    // Luồng Lấy lịch sử
    Page<TransactionResponse> getAllUserTransactions(UUID userId, Pageable pageable);
}