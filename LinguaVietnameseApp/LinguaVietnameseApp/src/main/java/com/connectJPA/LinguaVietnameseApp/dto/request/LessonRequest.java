package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

@Data
public class LessonRequest {
    @NotBlank(message = "Lesson name is required")
    @Size(max = 50, message = "Lesson name must not exceed 50 characters")
    private String lessonName;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 2, message = "Language code must be 2 characters")
    private String languageCode;

    @Min(value = 0, message = "EXP reward must be non-negative")
    private int expReward;


    private UUID creatorId;

    private SkillType skillType;

    private UUID courseId;

    private UUID lessonSeriesId;

    private UUID lessonCategoryId;

    private UUID lessonSubCategoryId;
}