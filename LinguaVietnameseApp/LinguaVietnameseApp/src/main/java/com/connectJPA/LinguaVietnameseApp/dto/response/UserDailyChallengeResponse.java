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
    private int targetAmount; // Thêm Target Amount để tính Progress
    
    private boolean completed; // Sửa tên thành 'completed' (không dùng isCompleted) để khớp với JSON property getCompleted() trong Entity
    
    private int expReward;
    private int rewardCoins;
    
    private ChallengeStatus status; // Thêm Status để kiểm tra CAN_CLAIM
    private ChallengePeriod period; // Thêm Period để lọc Daily/Weekly
    private String screenRoute; // Thêm Screen Route để navigate

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime assignedAt;

    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime completedAt;
}