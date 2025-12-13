package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequest {
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String description;

    private String difficultyLevel;

    private List<UUID> lessonIds;

    private BigDecimal price;

    private String instructionLanguage;

    @Size(max = 255, message = "Thumbnail URL must not exceed 255 characters")
    private String thumbnailUrl;

    private boolean isDeleted = false;

    private UUID creatorId;

    private String categoryCode;
}
