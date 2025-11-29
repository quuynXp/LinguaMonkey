package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonCategoryRequest {
    @NotBlank(message = "Lesson category name is required")
    @Size(max = 50, message = "Lesson category name must not exceed 50 characters")
    private String lessonCategoryName;

    private String description;
    private boolean isDeleted = false;
}
