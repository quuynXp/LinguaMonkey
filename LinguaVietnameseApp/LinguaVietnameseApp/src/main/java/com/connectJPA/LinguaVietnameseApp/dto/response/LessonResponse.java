package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.LessonType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LessonResponse {
    private UUID lessonId;
    private String lessonName;
    private String title;
    private String languageCode;
    private int expReward;
    private UUID courseId;
    private UUID lessonSeriesId;
    private UUID lessonCategoryId;
    private UUID lessonSubCategoryId;
    private LessonType lessonType;
    private SkillType skillTypes;
    private Integer flashcardCount;
    private Integer dueFlashcardsCount;
    private List<LessonQuestionResponse> questions;
    private List<String> videoUrls;
    private String description;
    private Integer orderIndex;
    private boolean isFree;
    private DifficultyLevel difficultyLevel;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private String certificateCode;
    private Integer passScorePercent;
    private Boolean shuffleQuestions;
    private Integer allowedRetakeCount;
}