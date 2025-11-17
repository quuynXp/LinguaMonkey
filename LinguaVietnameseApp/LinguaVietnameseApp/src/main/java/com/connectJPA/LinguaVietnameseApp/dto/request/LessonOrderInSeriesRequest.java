package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;
import lombok.*;
import java.util.UUID;

@Getter
@Builder
public class LessonOrderInSeriesRequest {
    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @NotNull(message = "Lesson series ID is required")
    private UUID lessonSeriesId;

    @NotNull(message = "Order index is required")
    private Integer orderIndex;

    private boolean isDeleted = false;
}
