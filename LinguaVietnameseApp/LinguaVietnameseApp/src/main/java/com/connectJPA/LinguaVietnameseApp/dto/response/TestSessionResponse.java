package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.TestSessionQuestion;
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
public class TestSessionResponse {
    private UUID sessionId;
    private List<QuestionDto> questions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionDto {
        private UUID questionId;
        private String questionText;
        private List<String> options;
        private String skillType;
        private Integer orderIndex;

        // Factory method để tạo DTO từ Entity (che giấu đáp án)
        public static QuestionDto fromEntity(TestSessionQuestion entity) {
            // Chuyển đổi Object (từ jsonb) sang List<String>
            List<String> optionsList = (List<String>) entity.getOptionsJson();

            return QuestionDto.builder()
                    .questionId(entity.getQuestionId())
                    .questionText(entity.getQuestionText())
                    .options(optionsList)
                    .skillType(entity.getSkillType())
                    .orderIndex(entity.getOrderIndex())
                    .build();
        }
    }
}