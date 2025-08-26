package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.response.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StatisticsService {

    StatisticsOverviewResponse getOverview(UUID userId, LocalDate startDate, LocalDate endDate, String aggregate);

    StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate);

    List<UserCountResponse> getUserCounts(String period, LocalDate startDate, LocalDate endDate);

    List<UserCountResponse> getUserGrowth(String period, LocalDate startDate, LocalDate endDate);

    List<ActivityCountResponse> getActivityStatistics(String activityType, LocalDate startDate, LocalDate endDate, String period);

    List<TransactionStatsResponse> getTransactionStatistics(String status, String provider, LocalDate startDate, LocalDate endDate, String period);
}