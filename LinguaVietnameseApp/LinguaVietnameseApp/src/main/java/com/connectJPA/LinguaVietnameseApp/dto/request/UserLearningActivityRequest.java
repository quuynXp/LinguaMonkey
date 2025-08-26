package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
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
}