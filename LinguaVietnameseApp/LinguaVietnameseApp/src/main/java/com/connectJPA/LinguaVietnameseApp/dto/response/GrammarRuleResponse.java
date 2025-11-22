package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrammarRuleResponse {
    private UUID ruleId;
    private UUID lessonId;
    private UUID topicId;
    private String title;
    private String ruleContent; // Replaces 'explanation'
    private String usageNotes;
    private List<String> examples;
    private List<GrammarExerciseResponse> exercises;

    // Progress tracking fields
    private Integer userScore;
    private OffsetDateTime completedAt;

    // Timestamps
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}