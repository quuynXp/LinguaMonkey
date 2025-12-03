package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.CourseVersionEnrollmentStatus;
import com.connectJPA.LinguaVietnameseApp.enums.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseVersionEnrollmentRequest {
    // courseId dùng để validate xem version có thuộc course này không (optional)
    private UUID courseId; 

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Course Version ID is required")
    private UUID courseVersionId; // BẮT BUỘC

    private CourseVersionEnrollmentStatus status;

    private PaymentStatus paymentStatus;

    @Builder.Default
    private OffsetDateTime enrolledAt = OffsetDateTime.now();
    
    private OffsetDateTime completedAt;
    
    @Builder.Default
    private boolean isDeleted = false;
}