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
import com.connectJPA.LinguaVietnameseApp.service.UserService; // Import User Service
import com.connectJPA.LinguaVietnameseApp.service.WalletService;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final UserService userService; // Inject UserService

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
                .provider(TransactionProvider.STRIPE) 
                .type(TransactionType.DEPOSIT)
                .description("Deposit to wallet")
                .status(TransactionStatus.PENDING)
                .build();
        transaction = transactionRepository.save(transaction);

        return createStripeCheckoutSession(transaction, request.getAmount(), request.getCurrency(), "Deposit to wallet", request.getReturnUrl());
    }

    @Override
    @Transactional
    public String createPaymentUrl(PaymentRequest request, String clientIp) {
        User user = getUser(request.getUserId());

        Transaction transaction = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .user(user)
                .amount(request.getAmount())
                .provider(TransactionProvider.STRIPE)
                .type(TransactionType.PAYMENT) 
                .description(request.getDescription())
                .status(TransactionStatus.PENDING)
                .build();
        transaction = transactionRepository.save(transaction);

        return createStripeCheckoutSession(transaction, request.getAmount(), request.getCurrency(), request.getDescription(), request.getReturnUrl());
    }

    private String createStripeCheckoutSession(Transaction transaction, BigDecimal amount, String currency, String description, String returnUrl) {
        Stripe.apiKey = stripeApiKey;

        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.ALIPAY)
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.WECHAT_PAY)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(returnUrl + "?status=success&transactionId=" + transaction.getTransactionId())
                .setCancelUrl(returnUrl + "?status=cancel&transactionId=" + transaction.getTransactionId())
                .setClientReferenceId(transaction.getTransactionId().toString())
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency != null ? currency.toLowerCase() : "usd")
                                .setUnitAmount(amount.multiply(BigDecimal.valueOf(100)).longValue())
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(description != null ? description : "LinguaVietnamese Transaction")
                                        .build())
                                .build())
                        .build());
        
        SessionCreateParams.PaymentMethodOptions.Builder optionsBuilder = SessionCreateParams.PaymentMethodOptions.builder()
                .setWechatPay(SessionCreateParams.PaymentMethodOptions.WechatPay.builder()
                        .setClient(SessionCreateParams.PaymentMethodOptions.WechatPay.Client.WEB)
                        .build());
        paramsBuilder.setPaymentMethodOptions(optionsBuilder.build());

        try {
            Session session = Session.create(paramsBuilder.build());
            return session.getUrl();
        } catch (Exception e) {
            log.error("Error creating Stripe checkout session: {}", e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED);
        }
    }

    @Override
    @Transactional
    public String handleWebhook(WebhookRequest request) {
        return handleStripeWebhook(request.getPayload());
    }

    @Transactional
    protected String handleStripeWebhook(Map<String, String> params) {
        String payload = params.get("payload");
        String signatureHeader = params.get("stripe-signature");

        if (payload == null || signatureHeader == null) {
             throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        try {
            Event event = Webhook.constructEvent(payload, signatureHeader, stripeWebhookSecret);
            EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();

            if (deserializer.getObject().isPresent()) {
                if ("checkout.session.completed".equals(event.getType())) {
                    Session session = (Session) deserializer.getObject().get();
                    handleSuccessfulPayment(session.getClientReferenceId());
                }
            }
            return "Webhook processed successfully";
        } catch (SignatureVerificationException e) {
            log.error("Stripe Signature Verification Failed");
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        } catch (Exception e) {
            log.error("Stripe Webhook Error: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private void handleSuccessfulPayment(String transactionId) {
        if (transactionId == null) return;

        Transaction transaction = transactionRepository.findById(UUID.fromString(transactionId))
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getStatus() == TransactionStatus.PENDING) {
            transaction.setStatus(TransactionStatus.SUCCESS);
            
            UUID userId = transaction.getUser().getUserId();
            BigDecimal amount = transaction.getAmount();

            if (transaction.getType() == TransactionType.DEPOSIT) {
                walletService.credit(userId, amount);
            } else if (transaction.getType() == TransactionType.PAYMENT) {
                // Determine if this is VIP purchase based on amount/description
                // Trial: 1.00 USD
                if (amount.compareTo(new BigDecimal("1.00")) == 0) {
                    userService.activateVipTrial(userId);
                }
                // Monthly/Yearly: > 9.00 USD
                else if (amount.compareTo(new BigDecimal("9.00")) > 0) {
                    userService.extendVipSubscription(userId, amount);
                }
            }
            
            transactionRepository.save(transaction);
            log.info("Transaction {} completed successfully via Stripe", transactionId);
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
                .provider(TransactionProvider.INTERNAL)
                .description("Withdraw from wallet")
                .build();
        transaction = transactionRepository.save(transaction);

        walletService.debit(user.getUserId(), request.getAmount());

        return transactionMapper.toResponse(transaction);
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

    @Override
    public Page<TransactionResponse> getAllTransactions(UUID userId, String status, Pageable pageable) {
        try {
            TransactionStatus transactionStatus = status != null ? TransactionStatus.valueOf(status) : null;
            Page<Transaction> transactions = transactionRepository.findByUserIdAndStatusAndIsDeletedFalse(userId, transactionStatus, pageable);
            return transactions.map(transactionMapper::toResponse);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }

    @Override
    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {
        userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Transaction transaction = transactionMapper.toEntity(request);
        transaction.setStatus(request.getStatus() != null ? request.getStatus() : TransactionStatus.PENDING);
        transaction = transactionRepository.save(transaction);
        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(UUID id, TransactionRequest request) {
        Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        transactionMapper.updateEntityFromRequest(request, transaction);
        transaction = transactionRepository.save(transaction);
        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional
    public void deleteTransaction(UUID id) {
        transactionRepository.findByTransactionIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        transactionRepository.softDeleteByTransactionId(id);
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
}