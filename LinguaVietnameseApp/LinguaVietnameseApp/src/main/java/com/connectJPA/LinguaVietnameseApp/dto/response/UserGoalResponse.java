package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class UserGoalResponse {
    private UUID goalId;
    private UUID userId;
    private String languageCode;
    private String examName;
    private Integer targetScore;
    private String targetSkill;
    private String customDescription;
    private String goalType;
    private String targetProficiency;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime targetDate;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}