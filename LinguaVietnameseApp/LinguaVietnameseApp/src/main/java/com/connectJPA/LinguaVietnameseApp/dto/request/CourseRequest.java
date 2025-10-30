package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class CourseRequest {
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String description;

    private String difficultyLevel;

    private List<UUID> lessonIds;

    private BigDecimal price;

    @Size(max = 255, message = "Thumbnail URL must not exceed 255 characters")
    private String thumbnailUrl;

    private boolean isDeleted = false;

    private UUID creatorId;
}
