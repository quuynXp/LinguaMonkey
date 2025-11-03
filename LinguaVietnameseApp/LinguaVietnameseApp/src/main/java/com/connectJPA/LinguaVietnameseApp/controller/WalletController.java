package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.WalletResponse;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import com.connectJPA.LinguaVietnameseApp.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final TransactionService transactionService;
    private final WalletService walletService;
    private final MessageSource messageSource;

    // === LẤY THÔNG TIN VÍ ===
    @GetMapping("/balance")
    public AppApiResponse<WalletResponse> getWalletBalance(
            @RequestParam UUID userId, // TODO: Lấy từ Principal/SecurityContext
            Locale locale) {
        WalletResponse wallet = walletService.getWalletByUserId(userId);
        return AppApiResponse.<WalletResponse>builder()
                .code(200)
                .message("Wallet balance retrieved")
                .result(wallet)
                .build();
    }

    @GetMapping("/history")
    public AppApiResponse<Page<TransactionResponse>> getTransactionHistory(
            @RequestParam UUID userId, // TODO: Lấy từ Principal/SecurityContext
            Pageable pageable,
            Locale locale) {
        Page<TransactionResponse> transactions = transactionService.getAllUserTransactions(userId, pageable);
        return AppApiResponse.<Page<TransactionResponse>>builder()
                .code(200)
                .message("Transaction history retrieved")
                .result(transactions)
                .build();
    }

    // === CÁC LUỒNG GIAO DỊCH ===

    @PostMapping("/deposit")
    public AppApiResponse<String> deposit(
            @Valid @RequestBody DepositRequest request,
            Locale locale) {
        // TODO: Đảm bảo request.userId khớp với user đang đăng nhập
        String paymentUrl = transactionService.createDepositUrl(request);
        return AppApiResponse.<String>builder()
                .code(200)
                .message("Deposit URL created")
                .result(paymentUrl)
                .build();
    }

    @PostMapping("/withdraw")
    public AppApiResponse<TransactionResponse> withdraw(
            @Valid @RequestBody WithdrawRequest request,
            Locale locale) {
        // TODO: Đảm bảo request.userId khớp với user đang đăng nhập
        TransactionResponse transaction = transactionService.withdraw(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(201)
                .message("Withdrawal request created")
                .result(transaction)
                .build();
    }

    @PostMapping("/transfer")
    public AppApiResponse<TransactionResponse> transfer(
            @Valid @RequestBody TransferRequest request,
            Locale locale) {
        // TODO: Đảm bảo request.senderId khớp với user đang đăng nhập
        TransactionResponse transaction = transactionService.transfer(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(201)
                .message("Transfer successful")
                .result(transaction)
                .build();
    }

    @PostMapping("/refund")
    public AppApiResponse<TransactionResponse> requestRefund(
            @Valid @RequestBody RefundRequest request,
            Locale locale) {
        // TODO: Đảm bảo request.requesterId khớp (admin hoặc user sở hữu originalTx)
        TransactionResponse transaction = transactionService.requestRefund(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(201)
                .message("Refund request submitted")
                .result(transaction)
                .build();
    }

    // === WEBHOOK ===
    @PostMapping("/webhook")
    public AppApiResponse<String> handleWebhook(
            @RequestBody WebhookRequest request,
            Locale locale) {
        String result = transactionService.handleWebhook(request);
        return AppApiResponse.<String>builder()
                .code(200)
                .message("Webhook processed")
                .result(result)
                .build();
    }

    // === ADMIN ===
    @PostMapping("/admin/approve-refund")
    // @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<TransactionResponse> approveRefund(
            @Valid @RequestBody ApproveRefundRequest request,
            Locale locale) {
        TransactionResponse transaction = transactionService.approveRefund(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Refund approved and processed")
                .result(transaction)
                .build();
    }

    @PostMapping("/admin/reject-refund")
    // @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<TransactionResponse> rejectRefund(
            @RequestParam UUID refundTransactionId,
            @RequestParam UUID adminId,
            @RequestParam String reason,
            Locale locale) {
        TransactionResponse transaction = transactionService.rejectRefund(refundTransactionId, adminId, reason);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Refund rejected")
                .result(transaction)
                .build();
    }
}