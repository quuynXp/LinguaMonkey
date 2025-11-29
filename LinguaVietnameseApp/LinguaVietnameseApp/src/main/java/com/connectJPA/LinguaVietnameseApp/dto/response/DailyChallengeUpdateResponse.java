package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DailyChallengeUpdateResponse {
    private UUID challengeId;
    private String title;
    private int progress;
    private int target;
    private boolean isCompleted;
    private int expReward;
    private int rewardCoins;
}