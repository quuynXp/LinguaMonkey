package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.ProficiencyTestConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestConfigResponse {
    private UUID testConfigId;
    private String testType;
    private String title;
    private String description;
    private Integer numQuestions;
    private String languageCode;
private Integer durationSeconds;

    public static TestConfigResponse fromEntity(ProficiencyTestConfig entity) {
        // Simple logic to estimate duration based on test type if not in DB
        // IELTS/TOEIC usually ~1 minute per question for simple mocks, or fixed 45-60 mins
        int estimatedDuration = 45 * 60; 
        if (entity.getTitle().contains("IELTS")) estimatedDuration = 40 * 60;
        else if (entity.getTitle().contains("TOEIC")) estimatedDuration = 120 * 60;
        else if (entity.getNumQuestions() != null) estimatedDuration = entity.getNumQuestions() * 60;

        return TestConfigResponse.builder()
                .testConfigId(entity.getTestConfigId())
                .testType(entity.getTestType())
                .languageCode(entity.getLanguageCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .numQuestions(entity.getNumQuestions())
                .durationSeconds(estimatedDuration) 
                .build();
    }
}