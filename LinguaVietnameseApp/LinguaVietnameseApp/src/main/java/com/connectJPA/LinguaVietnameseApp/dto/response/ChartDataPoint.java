package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ChartDataPoint {
    private String label;      // "Mon", "Tue", "01/12"
    private double value;      // Phút hoặc % accuracy
    private String fullDate;   // ISO date string "2025-01-15"
}