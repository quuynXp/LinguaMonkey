package com.connectJPA.LinguaVietnameseApp.dto;

import org.checkerframework.checker.units.qual.A;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OverviewMetricsDto {
    private long totalLearningTimeSeconds; // Tổng thời gian học (từ _END events)
    private long lessonsCompleted;
    private long badgesEarned;
    private double averageAccuracy;
    private long totalExperience;
    private long totalCoins;
    private long streakDays; // (Cần logic riêng để tính)
}
