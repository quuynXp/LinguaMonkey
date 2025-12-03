package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCourseVersionRequest {
    private String description;
    private String thumbnailUrl;
    private BigDecimal price;
    private String languageCode;
    private DifficultyLevel difficultyLevel;
    private String categoryCode;
    
    private List<UUID> lessonIds;
}