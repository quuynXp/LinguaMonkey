package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class GroupAnswerRequest {
    private UUID groupSessionId;
    private UUID lessonQuestionId;
    private UUID userId;

    @Size(max = 255, message = "Selected option must not exceed 255 characters")
    private String selectedOption;

    @NotNull(message = "Is correct is required")
    private Boolean isCorrect;

    private OffsetDateTime answeredAt = OffsetDateTime.now();
    private boolean isDeleted = false;
}
