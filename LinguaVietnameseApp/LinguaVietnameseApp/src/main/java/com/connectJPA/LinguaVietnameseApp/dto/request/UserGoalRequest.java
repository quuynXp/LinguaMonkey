package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class UserGoalRequest {
    private UUID userId;
    private String languageCode;
    private String examName;
    private Integer targetScore;
    private String targetSkill;
    private String customDescription;
    private String goalType;
    private String targetProficiency;
    private OffsetDateTime targetDate;
}