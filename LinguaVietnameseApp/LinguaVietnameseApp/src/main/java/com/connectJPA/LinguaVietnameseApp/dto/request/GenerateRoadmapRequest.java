package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class GenerateRoadmapRequest {
    private String userId;
    private String languageCode;
    private String targetProficiency;
    private String targetDate;
    private List<String> focusAreas;
    private int studyTimePerDay;
    private boolean isCustom;
    private String additionalPrompt;
}