package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LessonRequest {
    @NotBlank(message = "Lesson name is required")
    private String lessonName;

    private String title;

    private String languageCode;

    private int expReward;

    @NotNull(message = "Creator ID is required")
    private UUID creatorId;

    private SkillType skillType;

    private UUID courseId;

    private UUID lessonSeriesId;

    private List<String> mediaUrls;

    private UUID lessonCategoryId;

    private UUID lessonSubCategoryId;

    @Valid
    private List<LessonQuestionRequest> questions;
}