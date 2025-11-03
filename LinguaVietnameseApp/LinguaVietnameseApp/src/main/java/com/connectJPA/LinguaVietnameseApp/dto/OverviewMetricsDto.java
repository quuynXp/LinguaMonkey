package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.*;

@Data
@Builder
public class OverviewMetricsDto {
    private long totalLearningTimeSeconds; // Tổng thời gian học (từ _END events)
    private long lessonsCompleted;
    private long badgesEarned;
    private long streakDays; // (Cần logic riêng để tính)
}
