package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GrammarExerciseResponse {
    private UUID exerciseId;
    private UUID ruleId;
    private String type;
    private String question;
    private List<String> options;
    private String correct;
    private String explanation;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
