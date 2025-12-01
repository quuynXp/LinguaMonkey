package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseVersionResponse {
    private UUID versionId;
    private UUID courseId;
    private int versionNumber;
    private String title;
    private VersionStatus status;
    private String reasonForChange;
    private String description;
    private String thumbnailUrl;
    private DifficultyLevel difficultyLevel;
    private CourseType type;
    private String categoryCode;
    private BigDecimal price;
    private String languageCode;
    private OffsetDateTime publishedAt;

    private List<LessonSummaryResponse> lessons;
}