package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;
import lombok.*;
@Data
public class LearningActivityEventRequest {

    @NotNull
    private UUID userId;

    @NotNull
    private ActivityType activityType; // Phải là: LESSON_START, LESSON_END, CHAT_START, CHAT_END

    private UUID relatedEntityId; // ID của lesson hoặc chat session

    // Chỉ bắt buộc khi activityType là _END
    private Integer durationInSeconds;

    private String details;
}