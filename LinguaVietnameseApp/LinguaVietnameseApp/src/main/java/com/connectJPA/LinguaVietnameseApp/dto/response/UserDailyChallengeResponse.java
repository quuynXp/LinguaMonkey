package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
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
    private int targetAmount; 
    
    private boolean completed; 
    
    private int expReward;
    private int rewardCoins;
    
    private ChallengeStatus status; 
    private ChallengePeriod period; 
    private String screenRoute; 
    private String stack; // New field

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime assignedAt;

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime completedAt;
}