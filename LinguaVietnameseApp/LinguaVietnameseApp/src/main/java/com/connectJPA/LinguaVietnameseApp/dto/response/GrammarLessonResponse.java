package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrammarLessonResponse {
    private UUID lessonId;
    private UUID topicId;
    private String title;
    private String content;
    private String level;
    private List<GrammarRuleResponse> grammarRules;
    private String createdAt;
    private String updatedAt;
}