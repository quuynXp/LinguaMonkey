package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.ApproveRefundRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PaymentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TransactionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.WebhookRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.WithdrawRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RefundRequestResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {
    private final TransactionService transactionService;
    private final MessageSource messageSource;

    @Operation(summary = "Create a payment URL")
    @PostMapping("/create-payment")
    public ResponseEntity<AppApiResponse<String>> createPayment(
            @Valid @RequestBody PaymentRequest request,
            HttpServletRequest httpServletRequest,
            Locale locale) {
        String clientIp = getClientIp(httpServletRequest);
        String paymentUrl = transactionService.createPaymentUrl(request, clientIp);
        return ResponseEntity.ok(AppApiResponse.<String>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.payment.created.success", null, locale))
                .result(paymentUrl)
                .build());
    }

    @Operation(summary = "Handle VNPAY Return URL")
    @GetMapping("/vnpay-return")
    public void vnpayReturn(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String appRedirectUrl = transactionService.processVnPayReturn(request);

        response.sendRedirect(appRedirectUrl);
    }

    @Operation(summary = "Handle payment webhook")
    @PostMapping("/webhook")
    public ResponseEntity<AppApiResponse<String>> handleWebhook(
            @RequestBody WebhookRequest request,
            Locale locale) {
        String result = transactionService.handleWebhook(request);
        return ResponseEntity.ok(AppApiResponse.<String>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.webhook.success", null, locale))
                .result(result)
                .build());
    }

    @Operation(summary = "User request withdrawal")
    @PostMapping("/withdraw")
    public AppApiResponse<TransactionResponse> withdraw(
            @Valid @RequestBody WithdrawRequest request,
            Locale locale) {
        TransactionResponse response = transactionService.withdraw(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Withdrawal requested successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "[Admin] Get pending withdrawal requests")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/withdrawals/pending")
    public AppApiResponse<Page<TransactionResponse>> getPendingWithdrawals(
            Pageable pageable,
            Locale locale) {
        Page<TransactionResponse> withdrawals = transactionService.getPendingWithdrawals(pageable);
        return AppApiResponse.<Page<TransactionResponse>>builder()
                .code(200)
                .message("Pending withdrawals retrieved")
                .result(withdrawals)
                .build();
    }

    @Operation(summary = "[Admin] Approve a withdrawal")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping("/withdrawals/{id}/approve")
    public AppApiResponse<TransactionResponse> approveWithdrawal(
            @PathVariable UUID id,
            Locale locale) {
        TransactionResponse response = transactionService.approveWithdrawal(id);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Withdrawal approved successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "[Admin] Reject a withdrawal")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping("/withdrawals/{id}/reject")
    public AppApiResponse<TransactionResponse> rejectWithdrawal(
            @PathVariable UUID id,
            @RequestParam String reason,
            Locale locale) {
        TransactionResponse response = transactionService.rejectWithdrawal(id, reason);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Withdrawal rejected")
                .result(response)
                .build();
    }

    @Operation(summary = "[Admin] Get pending refund requests")
    @GetMapping("/refunds/pending")
    public AppApiResponse<Page<RefundRequestResponse>> getPendingRefunds(
            Pageable pageable,
            Locale locale) {
        Page<RefundRequestResponse> refunds = transactionService.getPendingRefundRequests(pageable);
        return AppApiResponse.<Page<RefundRequestResponse>>builder()
                .code(200)
                .message("Pending refunds retrieved")
                .result(refunds)
                .build();
    }

    @Operation(summary = "[Admin] Approve a refund")
    @PostMapping("/refunds/approve")
    public AppApiResponse<TransactionResponse> approveRefund(
            @RequestBody ApproveRefundRequest request,
            Locale locale) {
        TransactionResponse response = transactionService.approveRefund(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Refund approved successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "[Admin] Reject a refund")
    @PostMapping("/refunds/{id}/reject")
    public AppApiResponse<TransactionResponse> rejectRefund(
            @PathVariable UUID id,
            @RequestParam UUID adminId,
            @RequestParam String reason,
            Locale locale) {
        TransactionResponse response = transactionService.rejectRefund(id, adminId, reason);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message("Refund rejected")
                .result(response)
                .build();
    }

    @Operation(summary = "Get all transactions")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping
    public AppApiResponse<Page<TransactionResponse>> getAllTransactions(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String status,
            Pageable pageable,
            Locale locale) {
        Page<TransactionResponse> transactions = transactionService.getAllTransactions(userId, status, pageable);
        return AppApiResponse.<Page<TransactionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.list.success", null, locale))
                .result(transactions)
                .build();
    }

    @Operation(summary = "Get transaction by ID")
    @GetMapping("/{id}")
    public AppApiResponse<TransactionResponse> getTransactionById(
            @PathVariable UUID id,
            Locale locale) {
        TransactionResponse transaction = transactionService.getTransactionById(id);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.get.success", null, locale))
                .result(transaction)
                .build();
    }

    @Operation(summary = "Get all transactions by user")
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #userId.toString() == authentication.name")
    public AppApiResponse<Page<TransactionResponse>> getTransactionsByUser(
            @PathVariable UUID userId,
            Pageable pageable,
            Locale locale) {
        Page<TransactionResponse> transactions = transactionService.getAllUserTransactions(userId, pageable);
        return AppApiResponse.<Page<TransactionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.list.success", null, locale))
                .result(transactions)
                .build();
    }

    @Operation(summary = "Create a new transaction")
    @PostMapping
    public AppApiResponse<TransactionResponse> createTransaction(
            @Valid @RequestBody TransactionRequest request,
            Locale locale) {
        TransactionResponse transaction = transactionService.createTransaction(request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(201)
                .message(messageSource.getMessage("transaction.created.success", null, locale))
                .result(transaction)
                .build();
    }

    @Operation(summary = "Update a transaction")
    @PutMapping("/{id}")
    public AppApiResponse<TransactionResponse> updateTransaction(
            @PathVariable UUID id,
            @Valid @RequestBody TransactionRequest request,
            Locale locale) {
        TransactionResponse transaction = transactionService.updateTransaction(id, request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.updated.success", null, locale))
                .result(transaction)
                .build();
    }

    @Operation(summary = "Delete a transaction")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> deleteTransaction(
            @PathVariable UUID id,
            Locale locale) {
        transactionService.deleteTransaction(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.deleted.success", null, locale))
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }
}