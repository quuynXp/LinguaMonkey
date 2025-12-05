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
    
    // Options rời
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    
    // JSON Options (quan trọng cho FE mới)
    private String optionsJson;
    
    private String correctOption;
    private String mediaUrl;       // Chứa URL ảnh hoặc file ghi âm
    private String transcript;     // Chứa nội dung bài đọc hoặc transcript bài nói
    private String explainAnswer;  // Giải thích đáp án
    
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