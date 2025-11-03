package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionDto {
    private String id;
    private String questionText;
    private List<String> options;
    private int correctAnswerIndex;
    private String explanation;
    private String difficulty;
    private String skillType;
    private int points;
}
