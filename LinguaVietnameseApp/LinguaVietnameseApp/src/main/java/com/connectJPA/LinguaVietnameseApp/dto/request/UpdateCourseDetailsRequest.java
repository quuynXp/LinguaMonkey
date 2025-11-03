package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class UpdateCourseDetailsRequest {
    // Chỉ chứa các trường thuộc về Course entity, không phải CourseVersion
    private String title;
    private BigDecimal price;
    private String languageCode;
    private DifficultyLevel difficultyLevel;
}