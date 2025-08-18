package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class QuestionAnswerRequest {
    @NotNull(message = "Lesson question ID is required")
    private UUID lessonQuestionId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotBlank(message = "Selected option is required")
    @Size(max = 255, message = "Selected option must not exceed 255 characters")
    private String selectedOption;

    @NotNull(message = "Is correct is required")
    private Boolean isCorrect;

    private boolean isDeleted = false;
}
