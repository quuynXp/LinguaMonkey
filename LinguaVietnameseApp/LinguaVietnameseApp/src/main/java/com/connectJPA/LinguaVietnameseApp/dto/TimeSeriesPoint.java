package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TimeSeriesPoint {
    private String label;
    private BigDecimal revenue;
    private long transactions;
}
