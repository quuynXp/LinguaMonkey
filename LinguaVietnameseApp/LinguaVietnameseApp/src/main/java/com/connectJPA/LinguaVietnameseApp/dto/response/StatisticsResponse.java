package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsResponse {
    private int totalLessonsCompleted;
    private int totalCoursesEnrolled;
    private int totalQuizzesCompleted;
    private int totalGroupSessionsJoined;
    private int totalExamsTaken;
    private int totalDailyChallengesCompleted;
    private int totalEventsParticipated;
    private int totalVideoCallsJoined;

    private BigDecimal totalTransactionAmount;
    private long totalTransactions;
    private Map<String, Long> activityBreakdown; // đếm theo ActivityType
    private List<TimeSeriesPoint> timeSeries;

}
