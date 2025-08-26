package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.Certification;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import lombok.Data;

@Data
public class CreateRoadmapRequest {
    private String title;
    private String description;
    private String languageCode;
    private Integer currentLevel;
    private Integer targetLevel;
    private String targetProficiency;
    private Integer estimatedCompletionTime;
    private Certification certification;
}