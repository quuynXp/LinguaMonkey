package com.connectJPA.LinguaVietnameseApp.dto.response;

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
    private List<SkillType> skillTypes; // Derived from lesson_questions
    private List<String> videoUrls; // From videos table
}