package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.response.StatisticsResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface StatisticsService {
    StatisticsResponse getUserStatistics(UUID userId, LocalDate startDate, LocalDate endDate);
}