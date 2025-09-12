package com.connectJPA.LinguaVietnameseApp.dto.response;

// StatisticsOverviewResponse.java
import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class StatisticsOverviewResponse {
    private long totalUsers;
    private int totalCourses;
    private int totalLessons;
    private BigDecimal totalRevenue;
    private long totalTransactions;

    // thêm timeSeries để FE vẽ chart
    // có thể null nếu không cần
    private List<TimeSeriesPoint> timeSeries;

}

