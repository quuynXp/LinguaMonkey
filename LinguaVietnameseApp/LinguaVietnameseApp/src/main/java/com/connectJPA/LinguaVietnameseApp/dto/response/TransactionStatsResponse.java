package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class TransactionStatsResponse {
    private String status;
    private String provider;
    private String period;
    private long count;
    private BigDecimal totalAmount;
}