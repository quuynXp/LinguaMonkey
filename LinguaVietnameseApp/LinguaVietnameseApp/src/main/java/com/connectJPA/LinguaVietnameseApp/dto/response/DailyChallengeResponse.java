package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DailyChallengeResponse {
    private String id;
    private String title;
    private String description;
    private Integer baseExp;
    private Integer rewardCoins;
    private String difficulty;
}
