package com.connectJPA.LinguaVietnameseApp.dto;

import com.connectJPA.LinguaVietnameseApp.dto.response.TransactionResponse;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class TransactionSummaryDto {
    private long totalTransactions;
    private BigDecimal totalSpent;
    private List<TransactionResponse> recentTransactions; // (Optional: 3 giao dịch gần nhất)
}