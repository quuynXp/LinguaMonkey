package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LevelInfoResponse {
    private int currentLevel;
    private int currentExp;
    private int nextLevelExp;
}