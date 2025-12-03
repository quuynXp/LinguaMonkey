package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestResponse {
    private UUID refundTransactionId;
    private UUID originalTransactionId;
    private String requesterName;
    private String requesterEmail;
    private String courseName;
    private BigDecimal amount;
    private String reason;
    private TransactionStatus status;
    private OffsetDateTime requestDate;
    private Integer watchTimePercentage;
}