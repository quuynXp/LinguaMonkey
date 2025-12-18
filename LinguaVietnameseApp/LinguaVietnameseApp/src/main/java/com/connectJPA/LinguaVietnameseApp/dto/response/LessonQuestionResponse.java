package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonQuestionResponse {
    private UUID lessonQuestionId;
    private UUID lessonId;
    private String question;
    
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    
    private String optionsJson;
    
    private String correctOption;
    private String correctAnswer;
    
    private String mediaUrl;    
    private String transcript;  
    private String explainAnswer;
    
    private Integer weight;
    private Integer orderIndex;
    
    private QuestionType questionType;
    private SkillType skillType;
    private String languageCode;

    private boolean isDeleted;
    
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}