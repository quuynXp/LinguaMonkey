package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StatsResponse {
    // Current Period Stats
    private long totalSessions;
    private long totalTimeSeconds;
    private int totalCoins;
    private int lessonsCompleted;
    private int totalExperience;
    private double averageAccuracy; // Score / MaxScore * 100
    private double averageScore; // Score / MaxScore * 100
    
    // Comparisons (Percentage growth vs previous period)
    private double timeGrowthPercent;
    private double accuracyGrowthPercent;
    private double coinsGrowthPercent;
    
    // Insights
    private String weakestSkill; // e.g., "LISTENING"
    private String improvementSuggestion; // From AI
    
    // Charts Data
    private List<ChartDataPoint> timeChartData;
    private List<ChartDataPoint> accuracyChartData;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ChartDataPoint {
        private String label; // e.g., "Mon", "Tue"
        private double value;
        private String fullDate;
    }
}