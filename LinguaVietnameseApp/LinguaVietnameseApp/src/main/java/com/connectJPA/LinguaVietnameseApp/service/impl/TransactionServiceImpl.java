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
import com.connectJPA.LinguaVietnameseApp.service.UserService;
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
import java.math.RoundingMode;
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
    private final UserService userService;

    @Value("${stripe.api-key}")
    private String stripeApiKey;

    @Value("${stripe.webhook-secret}")
    private String stripeWebhookSecret;

    // --- CONFIGURABLE PRICES ---
    @Value("${vip.price.monthly:9.99}")
    private BigDecimal vipPriceMonthly;

    @Value("${vip.price.yearly:99.00}")
    private BigDecimal vipPriceYearly;
    
    // NEW: Trial price (e.g., 1.00 USD)
    @Value("${vip.price.trial:1.00}")
    private BigDecimal vipPriceTrial;

    @Value("${coin.exchange.rate:1000}")
    private int coinExchangeRate; // 1000 coins = 1 USD

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
                .currency(request.getCurrency()) // Ensure currency is set here too if DepositRequest has it
                .provider(TransactionProvider.STRIPE)
                .type(TransactionType.DEPOSIT)
                .description("Deposit to wallet")
                .status(TransactionStatus.PENDING)
                .build();
        
        // Safety check for currency in Deposit flow as well
        if (transaction.getCurrency() == null) transaction.setCurrency("USD");

        transaction = transactionRepository.save(transaction);

        return createStripeCheckoutSession(transaction, request.getAmount(), request.getCurrency(), "Deposit to wallet", request.getReturnUrl());
    }

    /**
     * Logic bảo mật:
     * 1. Xác định gói VIP (tháng/năm/trial) qua description.
     * 2. Tính giá gốc từ .env.
     * 3. Kiểm tra số coins user gửi lên có hợp lệ.
     * 4. Tính toán số tiền phải trả.
     * 5. So sánh với request amount.
     */
    private BigDecimal validateAndProcessVipPurchase(User user, BigDecimal requestedAmount, Integer coinsToUse, String description) {
        BigDecimal basePrice;
        
        // 1. Determine Base Price based on Description
        String descLower = description.toLowerCase();
        if (descLower.contains("monthly")) {
            basePrice = vipPriceMonthly;
        } else if (descLower.contains("yearly")) {
            basePrice = vipPriceYearly;
        } else if (descLower.contains("trial")) {
            // NEW: Handle Trial Logic
            basePrice = vipPriceTrial; // Usually 1.00
        } else {
            // Unknown plan, assume normal payment but strictly for VIP flow return requestedAmount to avoid blocking generic payments if mixed
            return requestedAmount; 
        }

        // 2. Validate Coins
        int coins = (coinsToUse != null) ? coinsToUse : 0;
        
        // NEW: Disable coins for Trial (1$ is already cheap)
        if (descLower.contains("trial") && coins > 0) {
             throw new AppException(ErrorCode.INVALID_REQUEST); // Cannot use coins for trial
        }

        if (coins > 0) {
            if (user.getCoins() < coins) {
                throw new AppException(ErrorCode.INVALID_AMOUNT);
            }
        }

        // 3. Calculate Discount
        BigDecimal discount = BigDecimal.ZERO;
        if (coins > 0) {
            discount = BigDecimal.valueOf(coins).divide(BigDecimal.valueOf(coinExchangeRate), 2, RoundingMode.HALF_UP);
        }

        BigDecimal expectedAmount = basePrice.subtract(discount);
        if (expectedAmount.compareTo(BigDecimal.ZERO) < 0) {
            expectedAmount = BigDecimal.ZERO;
        }

        // 4. Verify Request Amount matches Server Calculation
        // Allow small delta 0.05
        if (requestedAmount.subtract(expectedAmount).abs().compareTo(new BigDecimal("0.05")) > 0) {
            log.error("Price Mismatch! Expected: {}, Received: {}, Description: {}", expectedAmount, requestedAmount, description);
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }

        // 5. Deduct Coins
        if (coins > 0) {
            user.setCoins(user.getCoins() - coins);
            userRepository.save(user);
        }

        return expectedAmount;
    }

    @Override
    @Transactional
    public String createPaymentUrl(PaymentRequest request, String clientIp) {
        User user = getUser(request.getUserId());

        // Validate Price and Coins securely
        BigDecimal finalAmount = validateAndProcessVipPurchase(
            user, 
            request.getAmount(), 
            request.getCoins(), 
            request.getDescription()
        );

        // Security check: Stripe Payment Mode requires amount > 0
        // If 1$ trial, finalAmount is 1.00 -> OK.
        if (finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }

        Transaction transaction = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .user(user)
                .amount(finalAmount)
                .currency(request.getCurrency()) // FIXED: Set currency from request
                .provider(TransactionProvider.STRIPE)
                .type(TransactionType.PAYMENT)
                .description(request.getDescription())
                .status(TransactionStatus.PENDING)
                .build();
        
        // Safety Fallback
        if (transaction.getCurrency() == null) {
            transaction.setCurrency("USD");
        }

        transaction = transactionRepository.save(transaction);

        return createStripeCheckoutSession(transaction, finalAmount, request.getCurrency(), request.getDescription(), request.getReturnUrl());
    }

    private String createStripeCheckoutSession(Transaction transaction, BigDecimal amount, String currency, String description, String returnUrl) {
        Stripe.apiKey = stripeApiKey;
        
        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
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
                String descLower = transaction.getDescription().toLowerCase();
                
                // VIP Logic
                if (descLower.contains("vip") || descLower.contains("trial")) {
                      if (descLower.contains("monthly")) {
                        userService.extendVipSubscription(userId, new BigDecimal("30"));
                      } else if (descLower.contains("yearly")) {
                        userService.extendVipSubscription(userId, new BigDecimal("365"));
                      } else if (descLower.contains("trial")) {
                        // Activate 14 days trial
                        userService.extendVipSubscription(userId, new BigDecimal("14")); 
                        // OR userService.activateVipTrial(userId); depending on your UserService
                      }
                }
            }
            
            transactionRepository.save(transaction);
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
                return transactionMapper.toResponse(existingTx.get());
            }
        }

        Transaction transaction = Transaction.builder()
                .user(sender)
                .wallet(senderWallet)
                .sender(sender)
                .receiver(receiver)
                .amount(request.getAmount())
                .currency("USD") // Ensure defaults for transfers
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
                .currency("USD") // Ensure defaults
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
                .currency(originalTx.getCurrency()) // Inherit currency from original
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
        User user = userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        BigDecimal finalAmount = validateAndProcessVipPurchase(
            user, 
            request.getAmount(), 
            request.getCoins(), 
            request.getDescription()
        );

        Wallet wallet = getWallet(user.getUserId());
        if (wallet.getBalance().compareTo(finalAmount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_FUNDS);
        }

        Transaction transaction = transactionMapper.toEntity(request);
        transaction.setUser(user);
        transaction.setAmount(finalAmount);
        transaction.setStatus(request.getStatus() != null ? request.getStatus() : TransactionStatus.PENDING);
        
        // FIXED: Ensure currency is set (if DTO mapper didn't handle it)
        if (transaction.getCurrency() == null) {
            transaction.setCurrency("USD");
        }

        transaction = transactionRepository.save(transaction);
        
        walletService.debit(user.getUserId(), finalAmount);

        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
             String descLower = request.getDescription().toLowerCase();
             if (descLower.contains("vip") || descLower.contains("trial")) {
                 if (descLower.contains("monthly")) {
                    userService.extendVipSubscription(user.getUserId(), new BigDecimal("30"));
                 } else if (descLower.contains("yearly")) {
                    userService.extendVipSubscription(user.getUserId(), new BigDecimal("365"));
                 } else if (descLower.contains("trial")) {
                    userService.extendVipSubscription(user.getUserId(), new BigDecimal("14"));
                 }
            }
        }

        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(UUID id, TransactionRequest request) {
        Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        
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