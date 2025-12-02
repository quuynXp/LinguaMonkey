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

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
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

    @Value("${stripe.api-key}")
    private String stripeApiKey;

    @Value("${stripe.webhook-secret}")
    private String stripeWebhookSecret;

    // --- VNPAY CONFIG (Inject from .env usually) ---
    @Value("${vnpay.tmn-code:YOUR_TMN_CODE}")
    private String vnpTmnCode;
    @Value("${vnpay.hash-secret:YOUR_HASH_SECRET}")
    private String vnpHashSecret;
    @Value("${vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpPayUrl;
    // -----------------------------------------------

    @Value("${vip.price.monthly:9.99}")
    private BigDecimal vipPriceMonthly;

    @Value("${vip.price.yearly:99.00}")
    private BigDecimal vipPriceYearly;
    
    @Value("${vip.price.trial:1.00}")
    private BigDecimal vipPriceTrial;

    @Value("${coin.exchange.rate:1000}")
    private int coinExchangeRate;

    // Hardcoded for VNPAY demo (USD -> VND)
    private static final BigDecimal EXCHANGE_RATE_USD_VND = new BigDecimal("25000");

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
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .provider(request.getProvider()) // Handle multiple providers
                .type(TransactionType.DEPOSIT)
                .description("Deposit to wallet via " + request.getProvider())
                .status(TransactionStatus.PENDING)
                .build();
        
        transaction = transactionRepository.save(transaction);

        if (request.getProvider() == TransactionProvider.VNPAY) {
            return createVnPayUrl(transaction, request.getAmount(), request.getCurrency(), clientIp, request.getReturnUrl());
        } else {
            // Default to Stripe
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
            log.error("Price Mismatch! Expected: {}, Received: {}, Description: {}", expectedAmount, requestedAmount, description);
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
                .provider(request.getProvider()) // Support VNPAY
                .type(TransactionType.PAYMENT)
                .description(request.getDescription())
                .status(TransactionStatus.PENDING)
                .build();
        
        transaction = transactionRepository.save(transaction);

        if (request.getProvider() == TransactionProvider.VNPAY) {
            return createVnPayUrl(transaction, finalAmount, request.getCurrency(), clientIp, request.getReturnUrl());
        } else {
            return createStripeCheckoutSession(transaction, finalAmount, request.getCurrency(), request.getDescription(), request.getReturnUrl());
        }
    }

    private String createStripeCheckoutSession(Transaction transaction, BigDecimal amount, String currency, String description, String returnUrl) {
        Stripe.apiKey = stripeApiKey;
        // Stripe expects lower case currency
        String stripeCurrency = (currency != null) ? currency.toLowerCase() : "usd";
        
        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                // Append Transaction ID to return URL for status check
                .setSuccessUrl(returnUrl + "?status=success&transactionId=" + transaction.getTransactionId())
                .setCancelUrl(returnUrl + "?status=cancel&transactionId=" + transaction.getTransactionId())
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
            log.error("Error creating Stripe checkout session: {}", e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED);
        }
    }

    // --- VNPAY LOGIC ---
    private String createVnPayUrl(Transaction transaction, BigDecimal amount, String currency, String clientIp, String returnUrl) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_OrderInfo = (transaction.getDescription() != null) ? transaction.getDescription() : "Payment";
        String vnp_TxnRef = transaction.getTransactionId().toString();
        String vnp_IpAddr = (clientIp != null) ? clientIp : "127.0.0.1";
        String vnp_TmnCode = this.vnpTmnCode;

        // Ensure amount is in VND for VNPAY. 
        // VNPAY uses VND only. If current currency is USD, convert it.
        BigDecimal amountVND = amount;
        if (!"VND".equalsIgnoreCase(currency)) {
            amountVND = amount.multiply(EXCHANGE_RATE_USD_VND);
        }
        // VNPAY expects amount * 100
        long amountVal = amountVND.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amountVal));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", returnUrl);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        // Build Query URL & Hash
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                // Build hash data
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                // Build query
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
            if (key == null || data == null) {
                return "";
            }
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
    // -------------------

    @Override
    @Transactional
    public String handleWebhook(WebhookRequest request) {
        // Simple switch if VNPAY webhook needed later, currently focusing on Stripe
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

    // ... (withdraw, requestRefund, approveRefund, rejectRefund methods remain the same as context)
    @Override @Transactional public TransactionResponse withdraw(WithdrawRequest request) { 
        User user = getUser(request.getUserId());
        Wallet wallet = getWallet(user.getUserId());
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) throw new AppException(ErrorCode.INSUFFICIENT_FUNDS);
        Transaction transaction = Transaction.builder().user(user).wallet(wallet).amount(request.getAmount()).currency("USD").type(TransactionType.WITHDRAW).status(TransactionStatus.PENDING).provider(TransactionProvider.INTERNAL).description("Withdraw").build();
        transaction = transactionRepository.save(transaction);
        walletService.debit(user.getUserId(), request.getAmount());
        return transactionMapper.toResponse(transaction);
    }
    @Override @Transactional public TransactionResponse requestRefund(RefundRequest request) { 
        Transaction original = transactionRepository.findById(request.getOriginalTransactionId()).orElseThrow(()->new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        if (original.getStatus() != TransactionStatus.SUCCESS) throw new AppException(ErrorCode.TRANSACTION_NOT_REFUNDABLE);
        original.setStatus(TransactionStatus.PENDING_REFUND);
        transactionRepository.save(original);
        User requester = getUser(request.getRequesterId());
        Transaction refundTx = Transaction.builder().user(requester).wallet(original.getWallet()).sender(original.getReceiver()).receiver(original.getSender()).amount(original.getAmount()).currency(original.getCurrency()).type(TransactionType.REFUND).status(TransactionStatus.PENDING).provider(TransactionProvider.INTERNAL).originalTransaction(original).description("Refund Req").build();
        return transactionMapper.toResponse(transactionRepository.save(refundTx));
    }
    @Override @Transactional public TransactionResponse approveRefund(ApproveRefundRequest request) {
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
        } catch (Exception e) { throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION); }
    }
    @Override @Transactional public TransactionResponse rejectRefund(UUID refundTxId, UUID adminId, String reason) {
        Transaction refundTx = getRefundTx(refundTxId);
        refundTx.setStatus(TransactionStatus.REJECTED);
        refundTx.getOriginalTransaction().setStatus(TransactionStatus.SUCCESS);
        transactionRepository.save(refundTx);
        return transactionMapper.toResponse(refundTx);
    }
    @Override public Page<TransactionResponse> getAllTransactions(UUID userId, String status, Pageable pageable) { return null; }

 @Override
    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {
        // 1. Validate User
        User sender = userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 2. Calculate Final Amount (Apply Coins/Vip logic if needed)
        BigDecimal finalAmount = validateAndProcessPurchase(
            sender, 
            request.getAmount(), 
            request.getCoins(), 
            request.getDescription()
        );

        // 3. Check Balance (Internal Wallet Payment)
        Wallet senderWallet = getWallet(sender.getUserId());
        if (senderWallet.getBalance().compareTo(finalAmount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_FUNDS);
        }

        // 4. Prepare Transaction Entity
        Transaction transaction = transactionMapper.toEntity(request);
        transaction.setTransactionId(UUID.randomUUID());
        transaction.setUser(sender);
        transaction.setSender(sender); // Người trả tiền
        transaction.setAmount(finalAmount);
        transaction.setStatus(request.getStatus() != null ? request.getStatus() : TransactionStatus.PENDING);
        transaction.setCurrency("USD"); // Base currency của hệ thống

        // 5. Handle Receiver (Logic Admin/P2P)
        if (request.getReceiverId() != null) {
            // Trường hợp P2P: Mua khóa học, Donate
            User receiver = userRepository.findByUserIdAndIsDeletedFalse(request.getReceiverId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            transaction.setReceiver(receiver);
        } else {
            // Trường hợp VIP/System: Không có receiverId -> Tiền về hệ thống
            // Không setReceiver, tiền chỉ bị trừ khỏi ví người dùng
        }

        transaction = transactionRepository.save(transaction);

        // 6. Execute Money Transfer (The Logic Logic)
        // A. Trừ tiền người gửi
        walletService.debit(sender.getUserId(), finalAmount);

        // B. Cộng tiền người nhận (Nếu có)
        if (transaction.getReceiver() != null) {
            walletService.credit(transaction.getReceiver().getUserId(), finalAmount);
        }
        // Nếu receiver == null (VIP), tiền đã được debit khỏi user và "biến mất" khỏi hệ thống ví user 
        // (coi như đã chuyển vào túi Admin/Revenue của hệ thống).

        // 7. Post-Transaction Actions (VIP Activation)
        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
             String descLower = request.getDescription().toLowerCase();
             if (descLower.contains("vip") || descLower.contains("trial")) {
                 activateVipForUser(sender.getUserId(), descLower);
             }
        }

        return transactionMapper.toResponse(transaction);
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