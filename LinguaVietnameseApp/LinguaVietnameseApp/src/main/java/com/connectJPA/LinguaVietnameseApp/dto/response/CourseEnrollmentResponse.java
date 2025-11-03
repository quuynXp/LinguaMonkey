package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseEnrollmentResponse {
    private UUID enrollmentId;
    private UUID userId;
    private OffsetDateTime enrolledAt;

    private UUID courseId;
    private String courseTitle;

    private UUID courseVersionId;
    private int versionNumber;
}