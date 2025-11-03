package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.TestSessionQuestion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestResultResponse {
    private UUID sessionId;
    private int score;
    private int totalQuestions;
    private double percentage;
    private String proficiencyEstimate;
    private List<ResultQuestionDto> questions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultQuestionDto {
        private UUID questionId;
        private String questionText;
        private List<String> options;
        private String skillType;
        private Integer orderIndex;
        // Dữ liệu kết quả
        private Integer userAnswerIndex;
        private Integer correctAnswerIndex;
        private Boolean isCorrect;
        private String explanation;

        // Factory method để tạo DTO (hiện đầy đủ kết quả)
        public static ResultQuestionDto fromEntity(TestSessionQuestion entity) {
            List<String> optionsList = (List<String>) entity.getOptionsJson();

            return ResultQuestionDto.builder()
                    .questionId(entity.getQuestionId())
                    .questionText(entity.getQuestionText())
                    .options(optionsList)
                    .skillType(entity.getSkillType())
                    .orderIndex(entity.getOrderIndex())
                    .userAnswerIndex(entity.getUserAnswerIndex())
                    .correctAnswerIndex(entity.getCorrectAnswerIndex())
                    .isCorrect(entity.getIsCorrect())
                    .explanation(entity.getExplanation())
                    .build();
        }
    }
}