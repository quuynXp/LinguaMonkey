package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import jakarta.persistence.Column;
import lombok.*;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserLearningActivityRequest {
    private UUID userId;
    private ActivityType activityType;
    private Integer durationInSeconds;
    private String details;
    private UUID relatedEntityId;
}