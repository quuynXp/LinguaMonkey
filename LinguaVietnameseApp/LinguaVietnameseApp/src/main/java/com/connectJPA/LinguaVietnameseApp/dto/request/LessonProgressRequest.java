package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class LessonProgressRequest {
    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Score is required")
    @Min(value = 0, message = "Score must be non-negative")
    private Integer score;

    private OffsetDateTime completedAt;
    private boolean isDeleted = false;
}
