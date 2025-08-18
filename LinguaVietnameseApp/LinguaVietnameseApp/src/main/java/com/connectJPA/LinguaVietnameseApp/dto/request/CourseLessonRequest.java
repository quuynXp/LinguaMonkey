package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class CourseLessonRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @Min(value = 0, message = "Order index must be non-negative")
    private int orderIndex = 0;

    private boolean isDeleted = false;
}
