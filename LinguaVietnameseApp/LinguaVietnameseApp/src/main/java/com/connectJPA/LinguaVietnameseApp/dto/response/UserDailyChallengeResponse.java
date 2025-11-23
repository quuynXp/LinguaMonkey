package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDailyChallengeResponse {
    private UUID userId;
    private UUID challengeId;
    private String title;
    private String description;
    private int progress;
    private boolean isCompleted;
    private int expReward;
    private int rewardCoins;

    private OffsetDateTime assignedAt;

    private OffsetDateTime completedAt;
}