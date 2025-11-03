package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TransferRequest {
    @NotNull
    private UUID senderId;

    @NotNull
    private UUID receiverId;

    @NotNull
    @Min(1000) // Ví dụ: chuyển tối thiểu
    private BigDecimal amount;

    private String description;

    @NotNull
    private String idempotencyKey; // Chống double-spend
}
