package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LessonProgressWrongItemRequest {
    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Lesson question ID is required")
    private UUID lessonQuestionId;

    @Size(max = 255, message = "Wrong answer must not exceed 255 characters")
    private String wrongAnswer;

    private boolean isDeleted = false;
}
