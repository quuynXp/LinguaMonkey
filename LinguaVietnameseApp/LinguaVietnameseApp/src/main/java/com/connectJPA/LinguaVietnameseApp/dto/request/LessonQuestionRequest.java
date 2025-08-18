package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LessonQuestionRequest {
    private UUID lessonId;
    private String question;

    @Size(max = 255, message = "Option A must not exceed 255 characters")
    private String optionA;

    @Size(max = 255, message = "Option B must not exceed 255 characters")
    private String optionB;

    @Size(max = 255, message = "Option C must not exceed 255 characters")
    private String optionC;

    @Size(max = 255, message = "Option D must not exceed 255 characters")
    private String optionD;

    @Size(max = 255, message = "Correct option must not exceed 255 characters")
    private String correctOption;

    private boolean isDeleted = false;
}
