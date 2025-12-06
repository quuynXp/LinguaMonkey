package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.RefundRequestResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface TransactionService {
    Page<TransactionResponse> getAllUserTransactions(UUID userId, Pageable pageable);
    TransactionResponse getTransactionById(UUID id);
    
    // Updated: deposit now needs IP for VNPay Prod
    String createDepositUrl(DepositRequest request, String clientIp); 
    
    String handleWebhook(WebhookRequest request);
    TransactionResponse transfer(TransferRequest request);
    TransactionResponse withdraw(WithdrawRequest request);
    TransactionResponse requestRefund(RefundRequest request);
    TransactionResponse approveRefund(ApproveRefundRequest request);
    TransactionResponse rejectRefund(UUID refundTransactionId, UUID adminId, String reason);
    Page<TransactionResponse> getAllTransactions(UUID userId, String status, Pageable pageable);
    TransactionResponse createTransaction(TransactionRequest request);
    TransactionResponse updateTransaction(UUID id, TransactionRequest request);
    void deleteTransaction(UUID id);
    
    // Updated: payment URL now needs IP for VNPay Prod
    String createPaymentUrl(PaymentRequest request, String clientIp);
    Page<RefundRequestResponse> getPendingRefundRequests(Pageable pageable);
    String processVnPayReturn(HttpServletRequest request);
}