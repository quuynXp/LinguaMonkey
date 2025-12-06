package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseVersionEnrollmentResponse {
    private UUID enrollmentId;
    private UUID userId;
    private OffsetDateTime enrolledAt;
    private CourseResponse course;
    private CourseVersionResponse courseVersion;
    private Double progress; // Lưu ý: Entity là Double, DTO nên để Double hoặc int tùy logic mapping
    private int completedLessonsCount; // Field mới
}