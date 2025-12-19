package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TimeSeriesPoint {
    private String label;
    private String date;
    private BigDecimal revenue;
    private BigDecimal value; 
    private long transactions;
}