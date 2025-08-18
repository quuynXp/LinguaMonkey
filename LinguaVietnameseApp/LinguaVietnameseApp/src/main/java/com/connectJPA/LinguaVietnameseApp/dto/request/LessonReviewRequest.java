package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class LessonReviewRequest {
    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must not exceed 5")
    private BigDecimal rating;

    private String comment;

    private OffsetDateTime reviewedAt = OffsetDateTime.now();

    private boolean isDeleted = false;
}
