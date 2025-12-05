package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LessonRequest {
    @NotBlank(message = "Lesson name is required")
    @Size(max = 50, message = "Lesson name must not exceed 50 characters")
    private String lessonName;

    private String title;

    private String languageCode;

    private int expReward;

    private UUID creatorId;

    private SkillType skillType;

    private UUID courseId;

    private UUID lessonSeriesId;

    private List<String> mediaUrls;

    private UUID lessonCategoryId;

    private UUID lessonSubCategoryId;
}