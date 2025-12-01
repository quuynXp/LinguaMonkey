package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CoursePerformanceResponse {
    private UUID courseId;
    private String title;
    private int lessonsCount;
    private long studentsCount;
    private BigDecimal revenue;
    private long transactions;
    private List<TimeSeriesPoint> timeSeries; // revenue timeline for this course
}
