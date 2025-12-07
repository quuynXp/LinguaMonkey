package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WithdrawRequest {
    @NotNull
    private UUID userId;

    @NotNull
    @Min(100)
    private BigDecimal amount;

    @NotNull
    @Enumerated(EnumType.STRING)
    private TransactionProvider provider;

    @NotNull
    private String bankCode; // VCB, TCB, etc.

    @NotNull
    private String accountNumber;

    @NotNull
    private String accountName;
}
