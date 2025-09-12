package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.PaymentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TransactionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.WebhookRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {
    private final TransactionService transactionService;
    private final MessageSource messageSource;

    @Operation(summary = "Create a payment URL", description = "Generate a payment URL for VNPAY, MoMo, or Stripe")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment URL generated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid payment request")
    })
    @PostMapping("/create-payment")
    public ResponseEntity<AppApiResponse<String>> createPayment(
            @Valid @RequestBody PaymentRequest request,
            Locale locale) {
        String paymentUrl = transactionService.createPaymentUrl(request);
        return ResponseEntity.ok(AppApiResponse.<String>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.payment.created.success", null, locale))
                .result(paymentUrl)
                .build());
    }

    @Operation(summary = "Handle payment webhook", description = "Process webhook notifications from VNPAY, MoMo, or Stripe")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Webhook processed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid webhook data")
    })
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

    @Operation(summary = "Get all transactions", description = "Retrieve a paginated list of transactions with optional filtering by userId or status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved transactions"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Page<TransactionResponse>> getAllTransactions(
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Transaction status filter") @RequestParam(required = false) String status,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<TransactionResponse> transactions = transactionService.getAllTransactions(userId, status, pageable);
        return AppApiResponse.<Page<TransactionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.list.success", null, locale))
                .result(transactions)
                .build();
    }

    @Operation(summary = "Get transaction by ID", description = "Retrieve a transaction by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved transaction"),
            @ApiResponse(responseCode = "404", description = "Transaction not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<TransactionResponse> getTransactionById(
            @Parameter(description = "Transaction ID") @PathVariable UUID id,
            Locale locale) {
        TransactionResponse transaction = transactionService.getTransactionById(id);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.get.success", null, locale))
                .result(transaction)
                .build();
    }

    @Operation(summary = "Get all transactions by user", description = "Retrieve all transactions for the authenticated user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user transactions"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID")
    })
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<Page<TransactionResponse>> getTransactionsByUser(
            @PathVariable UUID userId,
            Pageable pageable,
            Locale locale) {
        Page<TransactionResponse> transactions = transactionService.getAllTransactions(userId, null, pageable);
        return AppApiResponse.<Page<TransactionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.list.success", null, locale))
                .result(transactions)
                .build();
    }


    @Operation(summary = "Create a new transaction", description = "Create a new transaction with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Transaction created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid transaction data")
    })
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

    @Operation(summary = "Update a transaction", description = "Update an existing transaction by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transaction updated successfully"),
            @ApiResponse(responseCode = "404", description = "Transaction not found"),
            @ApiResponse(responseCode = "400", description = "Invalid transaction data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<TransactionResponse> updateTransaction(
            @Parameter(description = "Transaction ID") @PathVariable UUID id,
            @Valid @RequestBody TransactionRequest request,
            Locale locale) {
        TransactionResponse transaction = transactionService.updateTransaction(id, request);
        return AppApiResponse.<TransactionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.updated.success", null, locale))
                .result(transaction)
                .build();
    }

    @Operation(summary = "Delete a transaction", description = "Soft delete a transaction by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transaction deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Transaction not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<Void> deleteTransaction(
            @Parameter(description = "Transaction ID") @PathVariable UUID id,
            Locale locale) {
        transactionService.deleteTransaction(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("transaction.deleted.success", null, locale))
                .build();
    }
}