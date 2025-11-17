package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonSeriesRequest {
    @NotBlank(message = "Lesson series name is required")
    @Size(max = 50, message = "Lesson series name must not exceed 50 characters")
    private String lessonSeriesName;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String description;

    private boolean isDeleted = false;
}
