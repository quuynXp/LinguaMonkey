package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionStatus;
import com.connectJPA.LinguaVietnameseApp.enums.TransactionType;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data // Bao gồm Getter, Setter, ToString, v.v.
@Builder
@NoArgsConstructor // Cần thiết cho Jackson deserialization (Fix lỗi 500)
@AllArgsConstructor // Cần thiết cho Builder pattern hoạt động cùng NoArgsConstructor
public class TransactionRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @DecimalMin(value = "0.0")
    private BigDecimal amount;

    @NotNull(message = "Provider is required")
    private TransactionProvider provider;

    private Integer coins;

    private UUID receiverId;

    private TransactionType type;
    
    private String description;
    private String currency;

    private TransactionStatus status;
}