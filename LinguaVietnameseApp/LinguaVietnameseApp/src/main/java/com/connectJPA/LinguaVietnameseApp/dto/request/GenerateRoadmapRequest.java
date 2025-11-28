package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class GenerateRoadmapRequest {
    private String userId;
    private String languageCode;
    private String targetProficiency;
    private String targetDate;
    private List<String> focusAreas;
    private int studyTimePerDay;
    @JsonProperty("isCustom")
    private boolean isCustom;
    private String additionalPrompt;
}