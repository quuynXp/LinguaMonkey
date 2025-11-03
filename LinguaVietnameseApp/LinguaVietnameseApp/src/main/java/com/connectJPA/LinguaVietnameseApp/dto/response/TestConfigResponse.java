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

    public static TestConfigResponse fromEntity(ProficiencyTestConfig config) {
        return TestConfigResponse.builder()
                .testConfigId(config.getTestConfigId())
                .testType(config.getTestType())
                .title(config.getTitle())
                .description(config.getDescription())
                .numQuestions(config.getNumQuestions())
                .build();
    }
}