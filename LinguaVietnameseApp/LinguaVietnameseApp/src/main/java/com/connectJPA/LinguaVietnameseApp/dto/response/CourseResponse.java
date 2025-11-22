// LinguaVietnameseApp/LinguaVietnameseApp/src/main/java/com/connectJPA/LinguaVietnameseApp/dto/response/CourseResponse.java
package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {
    private UUID courseId;
    private String title;
    private UUID creatorId;
    private BigDecimal price;
    private String languageCode;
    private DifficultyLevel difficultyLevel;
    private CourseType type;
    private CourseApprovalStatus approvalStatus;

    private CourseVersionResponse latestPublicVersion; // Nested DTO for 1-1 relationship

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    private String categoryCode;
}