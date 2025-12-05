package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonQuestionRequest {
    @NotNull(message = "Lesson ID cannot be null")
    private UUID lessonId;

    private String question;
    
    private QuestionType questionType;
    private SkillType skillType;
    private String languageCode;

    // FE gửi JSON string của options (A, B, C, D) vào đây
    private String optionsJson;

    // Vẫn giữ các field rời để tương thích ngược hoặc tiện mapping
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String correctOption;
    
    // Trường quan trọng cho tính năng mới
    private String transcript;
    private String mediaUrl;       
    private String explainAnswer;
    
    private Integer weight;
    private Integer orderIndex;
    private boolean isDeleted;
}