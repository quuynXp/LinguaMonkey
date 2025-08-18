package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LeaderboardEntryRequest {
    private UUID leaderboardId;
    private UUID userId;

    @NotNull(message = "Rank is required")
    @Min(value = 1, message = "Rank must be at least 1")
    private Integer rank;

    @NotNull(message = "Score is required")
    @Min(value = 0, message = "Score must be non-negative")
    private Integer score;

    @NotNull(message = "Level is required")
    @Min(value = 1, message = "Level must be at least 1")
    private Integer level;

    @NotNull(message = "Streak is required")
    @Min(value = 0, message = "Streak must be non-negative")
    private Integer streak;

    @NotNull(message = "Change is required")
    private Integer change;

    private boolean isDeleted = false;
}
