package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.Wallet;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.TransactionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.TransactionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.WalletRepository;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import com.connectJPA.LinguaVietnameseApp.service.WalletService;
import com.connectJPA.LinguaVietnameseApp.utils.VnPayUtils;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionServiceImpl implements TransactionService {
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final TransactionMapper transactionMapper;
    private final WalletRepository walletRepository;
    private final WalletService walletService;

    @Value("${vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${vnpay.url}")
    private String vnpUrl;

    @Value("${stripe.api-key}")
    private String stripeApiKey;

    @Value("${stripe.webhook-secret}")
    private String stripeWebhookSecret;

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAllUserTransactions(UUID userId, Pageable pageable) {
        Page<Transaction> transactions = transactionRepository.findByUser_UserIdOrSender_UserIdOrReceiver_UserId(
                userId, userId, userId, pageable
        );
        return transactions.map(transactionMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional
    public String createDepositUrl(DepositRequest request, String clientIp) {
        User user = getUser(request.getUserId());
        Wallet wallet = getWallet(user.getUserId());

        Transaction transaction = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .user(user)
                .wallet(wallet)
                .amount(request.getAmount())
                .provider(request.getProvider())
                .type(TransactionType.DEPOSIT)
                .description("Deposit to wallet")
                .status(TransactionStatus.PENDING)
                .build();
        transaction = transactionRepository.save(transaction);

        switch (request.getProvider()) {
            case VNPAY:
                return createVnpayPaymentUrl(transaction, request.getAmount(), request.getCurrency(), "Deposit to wallet", request.getReturnUrl(), clientIp);
            case STRIPE:
                return createStripeCheckoutSession(transaction, request.getAmount(), request.getCurrency(), "Deposit to wallet", request.getReturnUrl());
            default:
                throw new AppException(ErrorCode.INVALID_PAYMENT_PROVIDER);
        }
    }

    @Override
    @Transactional
    public String handleWebhook(WebhookRequest request) {
        try {
            switch (request.getProvider().toUpperCase()) {
                case "VNPAY":
                    return handleVnpayWebhook(request.getPayload());
                case "STRIPE":
                    return handleStripeWebhook(request.getPayload());
                default:
                    throw new AppException(ErrorCode.INVALID_PAYMENT_PROVIDER);
            }
        } catch (Exception e) {
            log.error("Error handling webhook: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    protected String handleVnpayWebhook(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        String transactionId = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");

        Transaction transaction = transactionRepository.findById(UUID.fromString(transactionId))
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType"); // Remove optional field if exists
        String queryString = VnPayUtils.buildQueryString(params);
        String computedHash = VnPayUtils.hmacSHA512(vnpHashSecret, queryString);

        if (!computedHash.equals(vnpSecureHash)) {
            log.error("Invalid VNPAY webhook signature for transaction ID: {}", transactionId);
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        }

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            return "Transaction already processed";
        }

        if ("00".equals(responseCode)) {
            transaction.setStatus(TransactionStatus.SUCCESS);
            walletService.credit(transaction.getUser().getUserId(), transaction.getAmount());
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
        }
        transactionRepository.save(transaction);
        return "Webhook processed successfully";
    }

    @Transactional
    protected String handleStripeWebhook(Map<String, String> params) {
        String payload = params.get("payload");
        String signatureHeader = params.get("stripe-signature");

        try {
            Event event = Webhook.constructEvent(payload, signatureHeader, stripeWebhookSecret);
            EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
            if (deserializer.getObject().isPresent()) {
                if ("checkout.session.completed".equals(event.getType())) {
                    Session session = (Session) deserializer.getObject().get();
                    String transactionId = session.getClientReferenceId();

                    Transaction transaction = transactionRepository.findById(UUID.fromString(transactionId))
                            .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

                    if (transaction.getStatus() != TransactionStatus.PENDING) {
                        return "Transaction already processed";
                    }

                    if ("paid".equals(session.getPaymentStatus())) {
                        transaction.setStatus(TransactionStatus.SUCCESS);
                        walletService.credit(transaction.getUser().getUserId(), transaction.getAmount());
                    } else {
                        transaction.setStatus(TransactionStatus.FAILED);
                    }
                    transactionRepository.save(transaction);
                }
            }
            return "Webhook processed successfully";
        } catch (SignatureVerificationException e) {
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Override
    @Transactional
    public TransactionResponse transfer(TransferRequest request) {
        if (request.getSenderId().equals(request.getReceiverId())) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }

        User sender = getUser(request.getSenderId());
        User receiver = getUser(request.getReceiverId());
        Wallet senderWallet = getWallet(sender.getUserId());
        getWallet(receiver.getUserId());

        if (request.getIdempotencyKey() != null) {
            var existingTx = transactionRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existingTx.isPresent()) {
                log.warn("Idempotent request re-detected: {}", request.getIdempotencyKey());
                return transactionMapper.toResponse(existingTx.get());
            }
        }

        Transaction transaction = Transaction.builder()
                .user(sender)
                .wallet(senderWallet)
                .sender(sender)
                .receiver(receiver)
                .amount(request.getAmount())
                .type(TransactionType.TRANSFER)
                .status(TransactionStatus.PENDING)
                .provider(TransactionProvider.INTERNAL)
                .idempotencyKey(request.getIdempotencyKey())
                .description(request.getDescription())
                .build();
        transaction = transactionRepository.save(transaction);

        try {
            walletService.debit(sender.getUserId(), request.getAmount());
            walletService.credit(receiver.getUserId(), request.getAmount());

            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction = transactionRepository.save(transaction);

            return transactionMapper.toResponse(transaction);
        } catch (Exception e) {
            transaction.setStatus(TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            log.error("Transfer failed: {}", e.getMessage());
            if (e instanceof AppException) throw e;
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public TransactionResponse withdraw(WithdrawRequest request) {
        User user = getUser(request.getUserId());
        Wallet wallet = getWallet(user.getUserId());

        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_FUNDS);
        }

        Transaction transaction = Transaction.builder()
                .user(user)
                .wallet(wallet)
                .amount(request.getAmount())
                .type(TransactionType.WITHDRAW)
                .status(TransactionStatus.PENDING)
                .provider(request.getProvider())
                .description("Withdraw from wallet")
                .build();
        transaction = transactionRepository.save(transaction);

        walletService.debit(user.getUserId(), request.getAmount());

        try {
            log.info("Withdrawal request created and awaiting PG processing: {}", transaction.getTransactionId());
            return transactionMapper.toResponse(transaction);
        } catch (Exception e) {
            log.error("Withdrawal failed during PG call: {}", e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED);
        }
    }

    @Override
    @Transactional
    public TransactionResponse requestRefund(RefundRequest request) {
        Transaction originalTx = transactionRepository.findById(request.getOriginalTransactionId())
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        User requester = getUser(request.getRequesterId());

        if (originalTx.getStatus() != TransactionStatus.SUCCESS) {
            throw new AppException(ErrorCode.TRANSACTION_NOT_REFUNDABLE);
        }

        originalTx.setStatus(TransactionStatus.PENDING_REFUND);
        transactionRepository.save(originalTx);

        Transaction refundTx = Transaction.builder()
                .user(requester)
                .wallet(originalTx.getWallet())
                .sender(originalTx.getReceiver())
                .receiver(originalTx.getSender())
                .amount(originalTx.getAmount())
                .type(TransactionType.REFUND)
                .status(TransactionStatus.PENDING)
                .provider(TransactionProvider.INTERNAL)
                .originalTransaction(originalTx)
                .description("Refund request: " + request.getReason())
                .build();

        refundTx = transactionRepository.save(refundTx);
        return transactionMapper.toResponse(refundTx);
    }

    @Override
    @Transactional
    public TransactionResponse approveRefund(ApproveRefundRequest request) {
        Transaction refundTx = getRefundTx(request.getRefundTransactionId());
        Transaction originalTx = refundTx.getOriginalTransaction();

        try {
            walletService.debit(refundTx.getSender().getUserId(), refundTx.getAmount());
            walletService.credit(refundTx.getReceiver().getUserId(), refundTx.getAmount());

            refundTx.setStatus(TransactionStatus.SUCCESS);
            originalTx.setStatus(TransactionStatus.REFUNDED);

            transactionRepository.save(refundTx);
            transactionRepository.save(originalTx);

            return transactionMapper.toResponse(refundTx);
        } catch (Exception e) {
            refundTx.setStatus(TransactionStatus.FAILED);
            originalTx.setStatus(TransactionStatus.SUCCESS);
            transactionRepository.save(refundTx);
            transactionRepository.save(originalTx);
            log.error("Refund approval failed: {}", e.getMessage());
            if (e instanceof AppException) throw e;
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public TransactionResponse rejectRefund(UUID refundTransactionId, UUID adminId, String reason) {
        Transaction refundTx = getRefundTx(refundTransactionId);
        Transaction originalTx = refundTx.getOriginalTransaction();

        refundTx.setStatus(TransactionStatus.REJECTED);
        refundTx.setDescription(refundTx.getDescription() + " | Rejected by admin: " + reason);
        originalTx.setStatus(TransactionStatus.SUCCESS);

        transactionRepository.save(refundTx);
        transactionRepository.save(originalTx);

        return transactionMapper.toResponse(refundTx);
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private Wallet getWallet(UUID userId) {
        return walletRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
    }

    private Transaction getRefundTx(UUID refundTxId) {
        Transaction refundTx = transactionRepository.findById(refundTxId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        if (refundTx.getStatus() != TransactionStatus.PENDING || refundTx.getType() != TransactionType.REFUND) {
            throw new AppException(ErrorCode.TRANSACTION_NOT_REFUNDABLE);
        }
        return refundTx;
    }

    @Override
    public Page<TransactionResponse> getAllTransactions(UUID userId, String status, Pageable pageable) {
        try {
            TransactionStatus transactionStatus = status != null ? TransactionStatus.valueOf(status) : null;
            Page<Transaction> transactions = transactionRepository.findByUserIdAndStatusAndIsDeletedFalse(userId, transactionStatus, pageable);
            return transactions.map(transactionMapper::toResponse);
        } catch (IllegalArgumentException e) {
            log.error("Invalid userId or status: {}", e.getMessage());
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            log.error("Error while fetching transactions: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {
        try {
            userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            Transaction transaction = transactionMapper.toEntity(request);
            transaction.setStatus(request.getStatus() != null ? request.getStatus() : TransactionStatus.PENDING);
            transaction = transactionRepository.save(transaction);
            return transactionMapper.toResponse(transaction);
        } catch (Exception e) {
            log.error("Error while creating transaction: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(UUID id, TransactionRequest request) {
        try {
            Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
            userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            transactionMapper.updateEntityFromRequest(request, transaction);
            transaction = transactionRepository.save(transaction);
            return transactionMapper.toResponse(transaction);
        } catch (Exception e) {
            log.error("Error while updating transaction ID {}: {}", id, e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteTransaction(UUID id) {
        try {
            Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
            transactionRepository.softDeleteByTransactionId(id);
        } catch (Exception e) {
            log.error("Error while deleting transaction ID {}: {}", id, e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public String createPaymentUrl(PaymentRequest request, String clientIp) {
        try {
            userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            Transaction transaction = Transaction.builder()
                    .transactionId(UUID.randomUUID())
                    .userId(request.getUserId())
                    .amount(request.getAmount())
                    .provider(request.getProvider())
                    .description(request.getDescription())
                    .status(TransactionStatus.PENDING)
                    .build();
            transaction = transactionRepository.save(transaction);

            switch (request.getProvider()) {
                case VNPAY:
                    return createVnpayPaymentUrl(transaction, request.getAmount(), request.getCurrency(), request.getDescription(), request.getReturnUrl(), clientIp);
                case STRIPE:
                    return createStripeCheckoutSession(transaction, request.getAmount(), request.getCurrency(), request.getDescription(), request.getReturnUrl());
                default:
                    throw new AppException(ErrorCode.INVALID_PAYMENT_PROVIDER);
            }
        } catch (Exception e) {
            log.error("Error while creating payment URL: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    // Refactored helper to support both Deposit and PaymentRequest and enforce Real IP
    private String createVnpayPaymentUrl(Transaction transaction, BigDecimal amount, String currency, String description, String returnUrl, String clientIp) {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_TmnCode", vnpTmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(amount.multiply(BigDecimal.valueOf(100)).longValue()));
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_CurrCode", currency != null ? currency : "VND");
        vnpParams.put("vnp_TxnRef", transaction.getTransactionId().toString());
        vnpParams.put("vnp_OrderInfo", description != null ? description : "LinguaVietnamese Payment");
        vnpParams.put("vnp_OrderType", "billpayment");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", returnUrl);
        // CRITICAL FOR PROD: Use real client IP
        vnpParams.put("vnp_IpAddr", clientIp != null ? clientIp : "127.0.0.1"); 
        vnpParams.put("vnp_CreateDate", String.valueOf(System.currentTimeMillis()));

        String queryString = VnPayUtils.buildQueryString(vnpParams);
        String secureHash = VnPayUtils.hmacSHA512(vnpHashSecret, queryString);
        return vnpUrl + "?" + queryString + "&vnp_SecureHash=" + secureHash;
    }

    private String createStripeCheckoutSession(Transaction transaction, BigDecimal amount, String currency, String description, String returnUrl) {
        Stripe.apiKey = stripeApiKey;
        Map<String, Object> params = new HashMap<>();
        params.put("payment_method_types", new String[]{"card"});
        params.put("line_items", new Object[]{
                new HashMap<String, Object>() {{
                    put("price_data", new HashMap<String, Object>() {{
                        put("currency", currency.toLowerCase());
                        put("unit_amount", amount.multiply(BigDecimal.valueOf(100)).longValue());
                        put("product_data", new HashMap<String, Object>() {{
                            put("name", description != null ? description : "LinguaVietnamese Payment");
                        }});
                    }});
                    put("quantity", 1);
                }}
        });
        params.put("mode", "payment");
        params.put("success_url", returnUrl + "?status=success&transactionId=" + transaction.getTransactionId());
        params.put("cancel_url", returnUrl + "?status=cancel&transactionId=" + transaction.getTransactionId());
        params.put("client_reference_id", transaction.getTransactionId().toString());

        try {
            com.stripe.model.checkout.Session session = com.stripe.model.checkout.Session.create(params);
            return session.getUrl();
        } catch (Exception e) {
            log.error("Error creating Stripe checkout session: {}", e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED);
        }
    }
}