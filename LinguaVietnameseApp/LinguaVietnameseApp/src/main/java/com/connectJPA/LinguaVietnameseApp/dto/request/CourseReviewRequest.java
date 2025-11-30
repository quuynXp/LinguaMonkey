package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseReviewRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    private BigDecimal rating;

    private String comment;
    private UUID parentId;
    private OffsetDateTime reviewedAt = OffsetDateTime.now();
    private boolean isDeleted = false;
}
