package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.*;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LeaderboardEntryRequest {
    private UUID leaderboardId;
    private UUID userId;

    @Min(value = 1, message = "Rank must be at least 1")
    private Integer rank;

    @Min(value = 0, message = "Score must be non-negative")
    private Integer score;

    @Min(value = 1, message = "Level must be at least 1")
    private Integer level;

    @Min(value = 0, message = "Streak must be non-negative")
    private Integer streak;

    private Integer change;

    private boolean isDeleted = false;

    public LeaderboardEntryRequest(UUID leaderboardId, UUID userId) {
        this.leaderboardId = leaderboardId;
        this.userId = userId;
    }
}
