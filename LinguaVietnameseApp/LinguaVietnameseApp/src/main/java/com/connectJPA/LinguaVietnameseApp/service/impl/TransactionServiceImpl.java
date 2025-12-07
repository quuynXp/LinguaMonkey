package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.RefundRequestResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.TransactionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.CurrencyService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
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
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.OffsetDateTime;
import java.util.*;

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
    private final CurrencyService currencyService;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionEnrollmentRepository enrollmentRepository;
    private final NotificationService notificationService;

    @Value("${stripe.api-key}")
    private String stripeApiKey;

    @Value("${stripe.webhook-secret}")
    private String stripeWebhookSecret;

    @Value("${vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${vnpay.url}")
    private String vnpPayUrl;

    @Value("${app.backend.url:http://localhost:8080}")
    private String appBackendUrl;

    @Value("${vip.price.monthly:9.99}")
    private BigDecimal vipPriceMonthly;

    @Value("${vip.price.yearly:99.00}")
    private BigDecimal vipPriceYearly;
    
    @Value("${vip.price.trial:1.00}")
    private BigDecimal vipPriceTrial;

    @Value("${coin.exchange.rate:1000}")
    private int coinExchangeRate;

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAllUserTransactions(UUID userId, Pageable pageable) {
        return transactionRepository.findByUser_UserIdOrSender_UserIdOrReceiver_UserId(
                userId, userId, userId, pageable
        ).map(transactionMapper::toResponse);
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
                .transactionId(UUID.randomUUID())
                .user(user)
                .wallet(wallet)
                .amount(request.getAmount())
                .currency("USD")
                .type(TransactionType.WITHDRAW)
                .status(TransactionStatus.PENDING)
                .provider(TransactionProvider.INTERNAL)
                .description("Withdrawal Request")
                .createdAt(OffsetDateTime.now())
                .build();
        
        transaction = transactionRepository.save(transaction);
        
        // Deduct balance immediately (Hold funds)
        walletService.debit(user.getUserId(), request.getAmount());

        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getPendingWithdrawals(Pageable pageable) {
        return transactionRepository.findByTypeAndStatus(TransactionType.WITHDRAW, TransactionStatus.PENDING, pageable)
                .map(transactionMapper::toResponse);
    }

    @Override
    @Transactional
    public TransactionResponse approveWithdrawal(UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getType() != TransactionType.WITHDRAW || transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_TRANSACTION_STATUS);
        }

        // Funds already deducted, just update status
        transaction.setStatus(TransactionStatus.SUCCESS);
        transactionRepository.save(transaction);

        notificationService.createPushNotification(NotificationRequest.builder()
                .userId(transaction.getUser().getUserId())
                .title("Withdrawal Approved")
                .content("Your withdrawal of " + transaction.getAmount() + " USD has been processed.")
                .type("WITHDRAWAL_APPROVED")
                .build());

        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse rejectWithdrawal(UUID transactionId, String reason) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (transaction.getType() != TransactionType.WITHDRAW || transaction.getStatus() != TransactionStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_TRANSACTION_STATUS);
        }

        // Refund the held amount
        walletService.credit(transaction.getUser().getUserId(), transaction.getAmount());

        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setDescription(transaction.getDescription() + " - Rejected: " + reason);
        transactionRepository.save(transaction);

        notificationService.createPushNotification(NotificationRequest.builder()
                .userId(transaction.getUser().getUserId())
                .title("Withdrawal Rejected")
                .content("Your withdrawal request was rejected: " + reason)
                .type("WITHDRAWAL_REJECTED")
                .build());

        return transactionMapper.toResponse(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RefundRequestResponse> getPendingRefundRequests(Pageable pageable) {
        return transactionRepository.findByTypeAndStatus(TransactionType.REFUND, TransactionStatus.PENDING, pageable)
                .map(tx -> RefundRequestResponse.builder()
                            .refundTransactionId(tx.getTransactionId())
                            .originalTransactionId(tx.getOriginalTransaction().getTransactionId())
                            .requesterName(tx.getUser().getFullname())
                            .requesterEmail(tx.getUser().getEmail())
                            .courseName(tx.getOriginalTransaction().getDescription())
                            .amount(tx.getAmount())
                            .reason(tx.getDescription())
                            .status(tx.getStatus())
                            .requestDate(tx.getCreatedAt())
                            .build());
    }

   @Override
    @Transactional
    public TransactionResponse approveRefund(ApproveRefundRequest request) {
        Transaction refundTx = getRefundTx(request.getRefundTransactionId());
        Transaction originalTx = refundTx.getOriginalTransaction();
        
        walletService.debit(refundTx.getSender().getUserId(), refundTx.getAmount());
        walletService.credit(refundTx.getReceiver().getUserId(), refundTx.getAmount());
        
        refundTx.setStatus(TransactionStatus.SUCCESS);
        originalTx.setStatus(TransactionStatus.REFUNDED);
        
        transactionRepository.save(refundTx);
        transactionRepository.save(originalTx);

        notificationService.createPushNotification(NotificationRequest.builder()
                .userId(refundTx.getReceiver().getUserId())
                .title("Refund Approved")
                .content("Your refund for " + originalTx.getDescription() + " has been approved by Admin.")
                .type("REFUND_APPROVED")
                .build());

        return transactionMapper.toResponse(refundTx);
    }

    @Override
    @Transactional
    public TransactionResponse rejectRefund(UUID refundTxId, UUID adminId, String reason) {
        Transaction refundTx = getRefundTx(refundTxId);
        
        refundTx.setStatus(TransactionStatus.REJECTED);
        refundTx.getOriginalTransaction().setStatus(TransactionStatus.SUCCESS);
        
        transactionRepository.save(refundTx);

        notificationService.createPushNotification(NotificationRequest.builder()
                .userId(refundTx.getUser().getUserId())
                .title("Refund Rejected")
                .content("Admin rejected your refund: " + reason)
                .type("REFUND_REJECTED")
                .build());

        return transactionMapper.toResponse(refundTx);
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
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .provider(request.getProvider())
                .type(TransactionType.DEPOSIT)
                .description("Deposit to wallet via " + request.getProvider())
                .status(TransactionStatus.PENDING)
                .createdAt(OffsetDateTime.now())
                .build();
        
        transaction = transactionRepository.save(transaction);

        if (request.getProvider() == TransactionProvider.VNPAY) {
            return createVnPayUrl(transaction, request.getAmount(), request.getCurrency(), clientIp);
        } else {
            return createStripeCheckoutSession(transaction, request.getAmount(), request.getCurrency(), "Deposit to wallet", request.getReturnUrl());
        }
    }

    private BigDecimal validateAndProcessVipPurchase(User user, BigDecimal requestedAmount, Integer coinsToUse, String description) {
        BigDecimal basePrice;
        String descLower = description.toLowerCase();
        
        if (descLower.contains("monthly")) {
            basePrice = vipPriceMonthly;
        } else if (descLower.contains("yearly")) {
            basePrice = vipPriceYearly;
        } else if (descLower.contains("trial")) {
            basePrice = vipPriceTrial;
        } else {
            return requestedAmount;
        }

        int coins = (coinsToUse != null) ? coinsToUse : 0;
        if (descLower.contains("trial") && coins > 0) {
             throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (coins > 0) {
            if (user.getCoins() < coins) {
                throw new AppException(ErrorCode.INVALID_AMOUNT);
            }
        }

        BigDecimal discount = BigDecimal.ZERO;
        if (coins > 0) {
            discount = BigDecimal.valueOf(coins).divide(BigDecimal.valueOf(coinExchangeRate), 2, RoundingMode.HALF_UP);
        }

        BigDecimal expectedAmount = basePrice.subtract(discount);
        if (expectedAmount.compareTo(BigDecimal.ZERO) < 0) {
            expectedAmount = BigDecimal.ZERO;
        }

        if (requestedAmount.subtract(expectedAmount).abs().compareTo(new BigDecimal("0.05")) > 0) {
            log.error("Price Mismatch! Expected: {}, Received: {}", expectedAmount, requestedAmount);
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }

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

        BigDecimal finalAmount = validateAndProcessVipPurchase(
            user, 
            request.getAmount(), 
            request.getCoins(), 
            request.getDescription()
        );

        if (finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }

        Transaction transaction = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .user(user)
                .amount(finalAmount)
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .provider(request.getProvider())
                .type(request.getType() != null ? request.getType() : TransactionType.PAYMENT)
                .description(request.getDescription())
                .status(TransactionStatus.PENDING)
                .createdAt(OffsetDateTime.now())
                .build();
        
        transaction = transactionRepository.save(transaction);

        if (request.getProvider() == TransactionProvider.VNPAY) {
            return createVnPayUrl(transaction, finalAmount, request.getCurrency(), clientIp);
        } else {
            return createStripeCheckoutSession(transaction, finalAmount, request.getCurrency(), request.getDescription(), request.getReturnUrl());
        }
    }

    private String createStripeCheckoutSession(Transaction transaction, BigDecimal amount, String currency, String description, String returnUrl) {
        Stripe.apiKey = stripeApiKey;
        String stripeCurrency = (currency != null) ? currency.toLowerCase() : "usd";
        
        String deepLinkSuccess = returnUrl + "?status=success&transactionId=" + transaction.getTransactionId();
        String deepLinkCancel = returnUrl + "?status=cancel&transactionId=" + transaction.getTransactionId();

        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(deepLinkSuccess)
                .setCancelUrl(deepLinkCancel)
                .setClientReferenceId(transaction.getTransactionId().toString())
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(stripeCurrency)
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
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED);
        }
    }

    private String createVnPayUrl(Transaction transaction, BigDecimal amount, String currency, String clientIp) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_OrderInfo = (transaction.getDescription() != null) ? transaction.getDescription() : "Payment";
        String vnp_TxnRef = transaction.getTransactionId().toString();
        String vnp_IpAddr = (clientIp != null) ? clientIp : "127.0.0.1";
        
        String backendReturnUrl = appBackendUrl + "/api/v1/transactions/vnpay-return";

        BigDecimal amountVND = amount;
        if (!"VND".equalsIgnoreCase(currency)) {
            BigDecimal rate = currencyService.getUsdToVndRate();
            amountVND = amount.multiply(rate);
        }
        
        long amountVal = amountVND.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnpTmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amountVal));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", backendReturnUrl);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                query.append('=');
                query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        
        String queryUrl = query.toString();
        String vnp_SecureHash = hmacSHA512(vnpHashSecret, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        
        return vnpPayUrl + "?" + queryUrl;
    }

    private String hmacSHA512(String key, String data) {
        try {
            if (key == null || data == null) return "";
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes();
            SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }

    @Override
    @Transactional
    public String processVnPayReturn(HttpServletRequest request) {
        Map<String, String> fields = new HashMap<>();
        for (Enumeration<String> params = request.getParameterNames(); params.hasMoreElements(); ) {
            String fieldName = params.nextElement();
            String fieldValue = request.getParameter(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                try {
                    fields.put(fieldName, URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                } catch (Exception e) {
                    log.error("Encoding error", e);
                }
            }
        }

        String vnp_SecureHash = request.getParameter("vnp_SecureHash");
        if (fields.containsKey("vnp_SecureHashType")) fields.remove("vnp_SecureHashType");
        if (fields.containsKey("vnp_SecureHash")) fields.remove("vnp_SecureHash");

        String signValue = hashAllFields(fields);
        String txnRef = request.getParameter("vnp_TxnRef");
        
        String baseDeepLink = "linguamonkey://deposit-result";

        if (signValue.equals(vnp_SecureHash)) {
            String responseCode = request.getParameter("vnp_ResponseCode");
            
            Transaction transaction = transactionRepository.findById(UUID.fromString(txnRef))
                    .orElse(null);

            if (transaction != null && transaction.getStatus() == TransactionStatus.PENDING) {
                if ("00".equals(responseCode)) {
                    transaction.setStatus(TransactionStatus.SUCCESS);
                    
                    if (transaction.getType() == TransactionType.DEPOSIT) {
                        walletService.credit(transaction.getUser().getUserId(), transaction.getAmount());
                    } else if (transaction.getType() == TransactionType.PAYMENT || transaction.getType() == TransactionType.UPGRADE_VIP) {
                          handleSuccessfulPayment(transaction.getTransactionId().toString());
                    }
                    
                    transactionRepository.save(transaction);
                    return baseDeepLink + "?status=success&transactionId=" + txnRef;
                } else {
                    transaction.setStatus(TransactionStatus.FAILED);
                    transactionRepository.save(transaction);
                    return baseDeepLink + "?status=failed&reason=payment_failed_code_" + responseCode;
                }
            } else {
                 return baseDeepLink + "?status=success&transactionId=" + txnRef;
            }
        } else {
            return baseDeepLink + "?status=failed&reason=invalid_checksum";
        }
    }
    
    private String hashAllFields(Map<String, String> fields) {
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder sb = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                sb.append(fieldName);
                sb.append("=");
                sb.append(fieldValue);
            }
            if (itr.hasNext()) {
                sb.append("&");
            }
        }
        return hmacSHA512(vnpHashSecret, sb.toString());
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
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        } catch (Exception e) {
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
            } else if (transaction.getType() == TransactionType.UPGRADE_VIP || transaction.getType() == TransactionType.PAYMENT) {
                boolean isVip = transaction.getType() == TransactionType.UPGRADE_VIP;
                String descLower = transaction.getDescription() != null ? transaction.getDescription().toLowerCase() : "";
                
                if (isVip || descLower.contains("vip") || descLower.contains("trial")) {
                      if (descLower.contains("monthly")) {
                        userService.extendVipSubscription(userId, new BigDecimal("30"));
                      } else if (descLower.contains("yearly")) {
                        userService.extendVipSubscription(userId, new BigDecimal("365"));
                      } else if (descLower.contains("trial")) {
                        userService.extendVipSubscription(userId, new BigDecimal("14")); 
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
                .transactionId(UUID.randomUUID())
                .user(sender)
                .wallet(senderWallet)
                .sender(sender)
                .receiver(receiver)
                .amount(request.getAmount())
                .currency("USD")
                .type(TransactionType.TRANSFER)
                .status(TransactionStatus.PENDING)
                .provider(TransactionProvider.INTERNAL)
                .idempotencyKey(request.getIdempotencyKey())
                .description(request.getDescription())
                .createdAt(OffsetDateTime.now())
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
    public Page<TransactionResponse> getAllTransactions(UUID userId, String status, Pageable pageable) {
        if (userId != null) {
            return transactionRepository.findByUser_UserId(userId, pageable).map(transactionMapper::toResponse);
        }
        if (status != null) {
            try {
                TransactionStatus ts = TransactionStatus.valueOf(status.toUpperCase());
                return transactionRepository.findByStatus(ts, pageable).map(transactionMapper::toResponse);
            } catch (IllegalArgumentException e) {
                return transactionRepository.findAll(pageable).map(transactionMapper::toResponse);
            }
        }
        return transactionRepository.findAll(pageable).map(transactionMapper::toResponse);
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
        transaction.setTransactionId(UUID.randomUUID());
        transaction.setUser(user);
        transaction.setSender(user);
        transaction.setAmount(finalAmount);
        transaction.setStatus(request.getStatus() != null ? request.getStatus() : TransactionStatus.PENDING);
        transaction.setCreatedAt(OffsetDateTime.now());
        
        if (transaction.getCurrency() == null) {
            transaction.setCurrency("USD");
        }
        
        if (request.getType() == TransactionType.UPGRADE_VIP) {
            transaction.setReceiver(null);
        } else if (request.getReceiverId() != null) {
            User receiver = userRepository.findByUserIdAndIsDeletedFalse(request.getReceiverId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            transaction.setReceiver(receiver);
        }
        
        transaction = transactionRepository.save(transaction);
        
        walletService.debit(user.getUserId(), finalAmount);

        if (transaction.getReceiver() != null) {
             walletService.credit(transaction.getReceiver().getUserId(), finalAmount);
        }

        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
             if (request.getCourseVersionId() != null) {
                 createEnrollment(user, request.getCourseVersionId());
             }

             if (request.getType() == TransactionType.UPGRADE_VIP) {
                 String descLower = request.getDescription() != null ? request.getDescription().toLowerCase() : "";
                 activateVipForUser(user.getUserId(), descLower);
             }
        }

        return transactionMapper.toResponse(transaction);
    }

    private void createEnrollment(User user, UUID courseVersionId) {
        CourseVersion version = courseVersionRepository.findById(courseVersionId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        boolean alreadyEnrolled = enrollmentRepository.existsByUserIdAndCourseVersion_VersionId(user.getUserId(), courseVersionId);
        if (alreadyEnrolled) {
            return;
        }

        CourseVersionEnrollment enrollment = CourseVersionEnrollment.builder()
                .enrollmentId(UUID.randomUUID())
                .userId(user.getUserId())
                .courseVersion(version)
                .progress(0.0)
                .status(CourseVersionEnrollmentStatus.IN_PROGRESS)
                .enrolledAt(OffsetDateTime.now())
                .build();

        enrollmentRepository.save(enrollment);
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(UUID id, TransactionRequest request) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        
        if(request.getStatus() != null) transaction.setStatus(request.getStatus());
        
        return transactionMapper.toResponse(transactionRepository.save(transaction));
    }
    
    @Override 
    @Transactional 
    public void deleteTransaction(UUID id) { 
        transactionRepository.deleteById(id);
    }

    @Override
    public TransactionResponse requestRefund(RefundRequest request) { 
        Transaction original = transactionRepository.findById(request.getOriginalTransactionId())
            .orElseThrow(()->new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        original.setStatus(TransactionStatus.PENDING_REFUND);
        transactionRepository.save(original);
        User requester = userRepository.findById(request.getRequesterId()).orElseThrow();
        Transaction refundTx = Transaction.builder()
            .user(requester)
            .wallet(original.getWallet())
            .sender(original.getReceiver())
            .receiver(original.getSender())
            .amount(original.getAmount())
            .currency(original.getCurrency())
            .type(TransactionType.REFUND)
            .status(TransactionStatus.PENDING)
            .provider(TransactionProvider.INTERNAL)
            .originalTransaction(original)
            .description(request.getReason())
            .createdAt(OffsetDateTime.now())
            .build();
        return transactionMapper.toResponse(transactionRepository.save(refundTx));
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
        
        if (refundTx.getType() != TransactionType.REFUND || 
           (refundTx.getStatus() != TransactionStatus.PENDING && refundTx.getStatus() != TransactionStatus.PENDING_REVIEW)) {
            throw new AppException(ErrorCode.TRANSACTION_NOT_REFUNDABLE);
        }
        return refundTx;
    }
    
    private void activateVipForUser(UUID userId, String descLower) {
         if (descLower.contains("monthly")) {
            userService.extendVipSubscription(userId, new BigDecimal("30"));
         } else if (descLower.contains("yearly")) {
            userService.extendVipSubscription(userId, new BigDecimal("365"));
         } else if (descLower.contains("trial")) {
            userService.extendVipSubscription(userId, new BigDecimal("14"));
         }
    }
}