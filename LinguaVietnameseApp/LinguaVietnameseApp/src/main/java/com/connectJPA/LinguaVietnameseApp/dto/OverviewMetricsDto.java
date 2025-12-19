package com.connectJPA.LinguaVietnameseApp.dto;

import org.checkerframework.checker.units.qual.A;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OverviewMetricsDto {
    private long totalLearningTimeSeconds;
    private long lessonsCompleted;
    private long badgesEarned;
    private int totalXP;
    private long totalLearningTime;
    private int currentStreak;
    private int wordsLearned;
    private double averageAccuracy;
    private long totalExperience;
    private long totalCoins;
    private long streakDays;
}
