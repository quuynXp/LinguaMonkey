package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
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
