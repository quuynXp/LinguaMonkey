package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DepositRequest {
    @NotNull
    private UUID userId;

    @NotNull
    @Min(10000) // Ví dụ: yêu cầu nạp tối thiểu
    private BigDecimal amount;

    @NotNull
    @Enumerated(EnumType.STRING)
    private TransactionProvider provider;

    @NotNull
    private String currency;

    @NotNull
    private String returnUrl;
}
