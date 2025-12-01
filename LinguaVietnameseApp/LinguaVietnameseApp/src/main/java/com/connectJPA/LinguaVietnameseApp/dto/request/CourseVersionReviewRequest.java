package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseVersionReviewRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    private UUID versionId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "5.0")
    private BigDecimal rating;

    @Size(max = 1000)
    private String comment;
    
    private UUID parentId;

    @Builder.Default
    private OffsetDateTime reviewedAt = OffsetDateTime.now();
    
    @Builder.Default
    private boolean isDeleted = false;
}