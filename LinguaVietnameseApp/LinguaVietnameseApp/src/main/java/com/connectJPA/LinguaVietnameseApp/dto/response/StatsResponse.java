package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatsResponse {
    private int totalSessions;
    private long totalTime; // in seconds
    private int totalExperience;
    private double averageScore; // percentage
}
