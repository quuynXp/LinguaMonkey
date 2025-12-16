package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StatisticsService {

    StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate);

    StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate);

    List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate);

    List<UserCountResponse> getUserGrowth(String period, LocalDate startDate, LocalDate endDate);

    List<ActivityCountResponse> getActivityStatistics(String activityType, LocalDate startDate, LocalDate endDate, String period);

    List<TransactionStatsResponse> getTransactionStatistics(String status, String provider, LocalDate startDate, LocalDate endDate, String period);

    TeacherOverviewResponse getTeacherOverview(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate);
    List<CoursePerformanceResponse> getTeacherCoursesPerformance(UUID teacherId, LocalDate startDate, LocalDate endDate, String aggregate);
    List<LessonStatsResponse> getTeacherCourseLessonStats(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate);
    List<TimeSeriesPoint> getTeacherCourseRevenue(UUID teacherId, UUID courseId, LocalDate startDate, LocalDate endDate, String aggregate);
    DashboardStatisticsResponse getDashboardStatistics(UUID userId, LocalDate startDate, LocalDate endDate);

    DepositRevenueResponse getDepositRevenueStatistics(LocalDate startDate, LocalDate endDate, String aggregate);

    StudyHistoryResponse getStudyHistory(UUID userId, LocalDate startDate, LocalDate endDate, String period);
}