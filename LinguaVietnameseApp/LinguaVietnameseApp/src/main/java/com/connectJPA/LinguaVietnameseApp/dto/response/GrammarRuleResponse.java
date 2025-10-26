package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GrammarRuleResponse {
    private UUID ruleId;
    private UUID topicId;
    private String title;
    private String explanation;
    private List<String> examples;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    private Integer userScore;
    private OffsetDateTime completedAt;

    private List<GrammarExerciseResponse> exercises;
}
