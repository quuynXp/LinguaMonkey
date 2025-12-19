package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;
import lombok.AllArgsConstructor;
import lombok.*;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherOverviewResponse {
    private int totalCourses;
    private int totalLessons;
    private long totalStudents;
    private BigDecimal totalRevenue;
    private long totalTransactions;
    private List<TimeSeriesPoint> timeSeries; // revenue timeline for teacher across his courses
}
