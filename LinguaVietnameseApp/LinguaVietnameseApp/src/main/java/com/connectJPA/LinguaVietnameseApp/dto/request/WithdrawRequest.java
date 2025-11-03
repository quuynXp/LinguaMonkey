package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.TransactionProvider;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class WithdrawRequest {
    @NotNull
    private UUID userId;

    @NotNull
    @Min(50000) // Ví dụ: rút tối thiểu
    private BigDecimal amount;

    @NotNull
    private TransactionProvider provider;

    // Thêm các trường thông tin ngân hàng của user
    // private String bankAccount;
    // private String bankCode;
}
