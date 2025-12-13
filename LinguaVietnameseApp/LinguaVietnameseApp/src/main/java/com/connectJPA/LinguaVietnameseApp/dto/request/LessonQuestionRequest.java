package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties; // Import
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class LessonQuestionRequest {
    
    private UUID lessonId;

    private String question;
    
    private QuestionType questionType; 

    private SkillType skillType;
    
    private String languageCode;

    private String optionsJson;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String correctOption;

    private String instructionLanguage;
    
    private String transcript;
    private String mediaUrl;        
    private String explainAnswer;
    
    private Integer weight;
    private Integer orderIndex;
    
    private boolean isDeleted;
}