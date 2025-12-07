package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.Transaction;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class TransactionResponse {
    private UUID transactionId;
    private UUID userId;
    private BigDecimal amount;
    private TransactionStatus status;
    private TransactionProvider provider;
    private TransactionType type;
    private String description;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deletedAt;
    
    private Transaction originalTransaction; 
    private UserProfileResponse user;
}