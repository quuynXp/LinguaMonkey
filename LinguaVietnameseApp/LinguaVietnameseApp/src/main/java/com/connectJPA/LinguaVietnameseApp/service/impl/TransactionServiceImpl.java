package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.PaymentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TransactionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.WebhookRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.TransactionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.TransactionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.TransactionService;
import com.connectJPA.LinguaVietnameseApp.utils.MomoUtils;
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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
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

    @Value("${vnpay.tmnCode}")
    private String vnpTmnCode;
    @Value("${vnpay.hashSecret}")
    private String vnpHashSecret;
    @Value("${vnpay.url}")
    private String vnpUrl;
    @Value("${momo.partnerCode}")
    private String momoPartnerCode;
    @Value("${momo.accessKey}")
    private String momoAccessKey;
    @Value("${momo.secretKey}")
    private String momoSecretKey;
    @Value("${momo.url}")
    private String momoUrl;
    @Value("${stripe.apiKey}")
    private String stripeApiKey;
    @Value("${stripe.webhookSecret}")
    private String stripeWebhookSecret;

    @Override
    @Cacheable(value = "transactions", key = "#userId + ':' + #status + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<TransactionResponse> getAllTransactions(String userId, String status, Pageable pageable) {
        try {
            UUID userUuid = userId != null ? UUID.fromString(userId) : null;
            TransactionStatus transactionStatus = status != null ? TransactionStatus.valueOf(status) : null;
            Page<Transaction> transactions = transactionRepository.findByUserIdAndStatusAndIsDeletedFalse(userUuid, transactionStatus, pageable);
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
    @Cacheable(value = "transactions", key = "#id")
    public TransactionResponse getTransactionById(UUID id) {
        try {
            Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
            return transactionMapper.toResponse(transaction);
        } catch (Exception e) {
            log.error("Error while fetching transaction ID {}: {}", id, e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "transactions", key = "#result.transactionId")
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
    @CachePut(value = "transactions", key = "#id")
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
    @CacheEvict(value = "transactions", key = "#id")
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
    public String createPaymentUrl(PaymentRequest request) {
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
                    return createVnpayPaymentUrl(transaction, request);
                case MOMO:
                    return createMomoPaymentUrl(transaction, request);
                case STRIPE:
                    return createStripeCheckoutSession(transaction, request);
                default:
                    throw new AppException(ErrorCode.INVALID_PAYMENT_PROVIDER);
            }
        } catch (Exception e) {
            log.error("Error while creating payment URL: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public String handleWebhook(WebhookRequest request) {
        try {
            switch (request.getProvider()) {
                case "VNPAY":
                    return handleVnpayWebhook(request.getPayload());
                case "MOMO":
                    return handleMomoWebhook(request.getPayload());
                case "STRIPE":
                    return handleStripeWebhook(request.getPayload());
                default:
                    throw new AppException(ErrorCode.INVALID_PAYMENT_PROVIDER);
            }
        } catch (Exception e) {
            log.error("Error while handling webhook for provider {}: {}", request.getProvider(), e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private String createVnpayPaymentUrl(Transaction transaction, PaymentRequest request) {
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_TmnCode", vnpTmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(request.getAmount().multiply(BigDecimal.valueOf(100)).longValue()));
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_CurrCode", request.getCurrency());
        vnpParams.put("vnp_TxnRef", transaction.getTransactionId().toString());
        vnpParams.put("vnp_OrderInfo", request.getDescription() != null ? request.getDescription() : "Payment for LinguaVietnamese");
        vnpParams.put("vnp_OrderType", "billpayment");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", request.getReturnUrl());
        vnpParams.put("vnp_IpAddr", "127.0.0.1");
        vnpParams.put("vnp_CreateDate", String.valueOf(System.currentTimeMillis()));

        String queryString = VnPayUtils.buildQueryString(vnpParams);
        String secureHash = VnPayUtils.hmacSHA512(vnpHashSecret, queryString);
        return vnpUrl + "?" + queryString + "&vnp_SecureHash=" + secureHash;
    }

    private String createMomoPaymentUrl(Transaction transaction, PaymentRequest request) {
        Map<String, String> momoParams = new HashMap<>();
        momoParams.put("partnerCode", momoPartnerCode);
        momoParams.put("accessKey", momoAccessKey);
        momoParams.put("requestId", UUID.randomUUID().toString());
        momoParams.put("amount", request.getAmount().toString());
        momoParams.put("orderId", transaction.getTransactionId().toString());
        momoParams.put("orderInfo", request.getDescription() != null ? request.getDescription() : "Payment for LinguaVietnamese");
        momoParams.put("returnUrl", request.getReturnUrl());
        momoParams.put("notifyUrl", "https://yourapp.com/api/transactions/momo-notify");
        momoParams.put("requestType", "captureMoMoWallet");

        String signature = MomoUtils.generateSignature(momoParams, momoSecretKey);
        momoParams.put("signature", signature);

        // Simulate HTTP POST to MoMo API
        // In practice, use RestTemplate or WebClient to call MoMo API
        return momoUrl + "?data=" + MomoUtils.toJson(momoParams);
    }

    private String createStripeCheckoutSession(Transaction transaction, PaymentRequest request) {
        Stripe.apiKey = stripeApiKey;
        Map<String, Object> params = new HashMap<>();
        params.put("payment_method_types", new String[]{"card"});
        params.put("line_items", new Object[]{
                new HashMap<String, Object>() {{
                    put("price_data", new HashMap<String, Object>() {{
                        put("currency", request.getCurrency().toLowerCase());
                        put("unit_amount", request.getAmount().multiply(BigDecimal.valueOf(100)).longValue());
                        put("product_data", new HashMap<String, Object>() {{
                            put("name", request.getDescription() != null ? request.getDescription() : "LinguaVietnamese Payment");
                        }});
                    }});
                    put("quantity", 1);
                }}
        });
        params.put("mode", "payment");
        params.put("success_url", request.getReturnUrl() + "?transactionId=" + transaction.getTransactionId());
        params.put("cancel_url", request.getReturnUrl() + "?transactionId=" + transaction.getTransactionId());
        params.put("client_reference_id", transaction.getTransactionId().toString());

        try {
            com.stripe.model.checkout.Session session = com.stripe.model.checkout.Session.create(params);
            return session.getUrl();
        } catch (Exception e) {
            log.error("Error creating Stripe checkout session: {}", e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_FAILED);
        }
    }

    private String handleVnpayWebhook(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        String transactionId = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");

        Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(UUID.fromString(transactionId))
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        String queryString = VnPayUtils.buildQueryString(params);
        String computedHash = VnPayUtils.hmacSHA512(vnpHashSecret, queryString);

        if (!computedHash.equals(vnpSecureHash)) {
            log.error("Invalid VNPAY webhook signature for transaction ID: {}", transactionId);
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        }

        if ("00".equals(responseCode)) {
            transaction.setStatus(TransactionStatus.SUCCESS);
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
        }
        transactionRepository.save(transaction);
        return "Webhook processed successfully";
    }

    private String handleMomoWebhook(Map<String, String> params) {
        String requestId = params.get("requestId");
        String orderId = params.get("orderId");
        String resultCode = params.get("resultCode");

        Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(UUID.fromString(orderId))
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        String computedSignature = MomoUtils.generateSignature(params, momoSecretKey);
        if (!computedSignature.equals(params.get("signature"))) {
            log.error("Invalid MoMo webhook signature for transaction ID: {}", orderId);
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        }

        if ("0".equals(resultCode)) {
            transaction.setStatus(TransactionStatus.SUCCESS);
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
        }
        transactionRepository.save(transaction);
        return "Webhook processed successfully";
    }

    private String handleStripeWebhook(Map<String, String> params) {
        String payload = params.get("payload");
        String signatureHeader = params.get("stripe-signature");

        try {
            Event event = Webhook.constructEvent(payload, signatureHeader, stripeWebhookSecret);
            EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
            if (deserializer.getObject().isPresent()) {
                if ("checkout.session.completed".equals(event.getType())) {
                    Session session = (Session) deserializer.getObject().get();
                    String transactionId = session.getClientReferenceId();

                    Transaction transaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(UUID.fromString(transactionId))
                            .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

                    if ("paid".equals(session.getPaymentStatus())) {
                        transaction.setStatus(TransactionStatus.SUCCESS);
                    } else {
                        transaction.setStatus(TransactionStatus.FAILED);
                    }
                    transactionRepository.save(transaction);
                }
            }
            return "Webhook processed successfully";
        } catch (SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature: {}", e.getMessage());
            throw new AppException(ErrorCode.INVALID_SIGNATURE);
        } catch (Exception e) {
            log.error("Error processing Stripe webhook: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}