package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRefundRequest {
    @NotNull
    private UUID refundTransactionId; // ID của giao dịch REFUND (đang PENDING)

    @NotNull
    private UUID adminId;

    private String notes;
}
