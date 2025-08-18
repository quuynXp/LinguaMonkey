package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class LeaderboardResponse {
    private UUID leaderboardId;
    private String period;
    private String tab;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime snapshotDate;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}
