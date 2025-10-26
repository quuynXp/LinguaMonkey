package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class UpdateGrammarProgressRequest {
    private UUID topicId;
    private UUID ruleId;
    private UUID userId;
    private Integer score;
}
