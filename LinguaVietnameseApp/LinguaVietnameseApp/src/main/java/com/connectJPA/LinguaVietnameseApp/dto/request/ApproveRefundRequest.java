package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ApproveRefundRequest {
    @NotNull
    private UUID refundTransactionId; // ID của giao dịch REFUND (đang PENDING)

    @NotNull
    private UUID adminId;
}
