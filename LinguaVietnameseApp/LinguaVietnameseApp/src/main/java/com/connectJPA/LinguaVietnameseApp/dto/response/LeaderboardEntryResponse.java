package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class LeaderboardEntryResponse {
    private UUID leaderboardEntryId;
    private UUID leaderboardId;
    private UUID userId;
    private String name;
    private String avatarUrl;
    private Integer rank;
    private Integer score;
    private Integer level;
    private Integer streak;
    private Integer change;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
