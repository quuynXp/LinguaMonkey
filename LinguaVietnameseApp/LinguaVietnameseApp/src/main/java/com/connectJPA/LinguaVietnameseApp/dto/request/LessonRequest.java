package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.LessonType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties; // Import cái này
import com.fasterxml.jackson.annotation.JsonProperty;         // Import cái này
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class LessonRequest {
    @NotBlank(message = "Lesson name is required")
    private String lessonName;

    private String title;

    private String languageCode;

    private int expReward;

    private LessonType lessonType;

    @NotNull(message = "Creator ID is required")
    private UUID creatorId;

    private SkillType skillType;

    private DifficultyLevel difficultyLevel;

    private Integer orderIndex;

    @JsonProperty("isFree")
    private Boolean isFree;

    private Integer durationSeconds;

    private Integer passScorePercent;

    private Boolean shuffleQuestions;

    private Integer allowedRetakeCount;

    private UUID courseId;

    private UUID versionId; 

    private UUID lessonSeriesId;

    private List<String> mediaUrls;

    private UUID lessonCategoryId;

    private UUID lessonSubCategoryId;

    @Valid
    private List<LessonQuestionRequest> questions;
}