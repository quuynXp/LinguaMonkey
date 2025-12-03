package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatorDashboardResponse {
    private long totalStudents;
    private long totalReviews;
    private double averageRating;
    
    private BigDecimal revenueToday;
    private BigDecimal revenueWeek;
    private BigDecimal revenueMonth;
    private BigDecimal revenueYear;
    
    private List<ChartDataPoint> revenueChart;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private String label; // e.g., "Mon", "Tue" or Date
        private BigDecimal value;
    }
}