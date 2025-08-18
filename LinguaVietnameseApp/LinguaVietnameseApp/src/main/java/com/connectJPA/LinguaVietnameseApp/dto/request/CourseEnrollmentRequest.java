package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.CourseEnrollmentStatus;
import com.connectJPA.LinguaVietnameseApp.enums.PaymentStatus;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class CourseEnrollmentRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    private CourseEnrollmentStatus status;

    private PaymentStatus paymentStatus;

    private OffsetDateTime enrolledAt = OffsetDateTime.now();
    private OffsetDateTime completedAt;
    private boolean isDeleted = false;
}
