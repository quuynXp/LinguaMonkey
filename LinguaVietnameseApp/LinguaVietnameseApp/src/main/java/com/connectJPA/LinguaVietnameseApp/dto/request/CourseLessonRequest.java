package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseLessonRequest {
    private UUID courseId; 

    @NotNull(message = "Version ID is required")
    private UUID versionId;

    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @Min(value = 0, message = "Order index must be non-negative")
    private int orderIndex = 0;

    private boolean isDeleted = false;
}