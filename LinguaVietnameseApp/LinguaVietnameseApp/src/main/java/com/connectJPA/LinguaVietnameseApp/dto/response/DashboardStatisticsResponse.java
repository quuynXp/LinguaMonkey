package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.*;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class DashboardStatisticsResponse {
    private OverviewMetricsDto overview;
    private List<TimeSeriesPoint> learningTimeChart; // Dữ liệu cho biểu đồ thời gian học
    private List<CourseProgressDto> courseProgress;
    private BadgeProgressDto badgeProgress;
    private TransactionSummaryDto transactionSummary;
    private List<UserLearningActivityResponse> recentActivities; // (Optional: 5 hoạt động gần nhất)
}