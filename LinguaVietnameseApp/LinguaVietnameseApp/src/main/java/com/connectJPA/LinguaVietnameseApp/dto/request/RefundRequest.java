package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class RefundRequest {
    @NotNull
    private UUID originalTransactionId; // Giao dịch P2P (mua course)

    @NotNull
    private UUID requesterId; // Người yêu cầu (admin hoặc user)

    @NotNull
    private String reason;
}
