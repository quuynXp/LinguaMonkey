package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import lombok.AllArgsConstructor;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class StatisticsOverviewResponse {
    private long totalUsers;
    private int totalCourses;
    private int totalLessons;
    private BigDecimal totalRevenue;
    private long totalTransactions;

    private List<TimeSeriesPoint> timeSeries;

}

