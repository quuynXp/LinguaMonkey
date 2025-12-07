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
    private UUID lessonId;

    @NotNull(message = "Question content is required")
    private String question;
    
    @NotNull(message = "Question Type is required (CHECK ENUM UPPERCASE)")
    private QuestionType questionType; 

    private SkillType skillType;
    
    private String languageCode;

    private String optionsJson;

    // Các field rời rạc (nên ưu tiên dùng optionsJson để nhẹ payload)
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String correctOption;
    
    private String transcript;
    private String mediaUrl;        
    private String explainAnswer;
    
    private Integer weight;
    private Integer orderIndex;
    private boolean isDeleted;
}