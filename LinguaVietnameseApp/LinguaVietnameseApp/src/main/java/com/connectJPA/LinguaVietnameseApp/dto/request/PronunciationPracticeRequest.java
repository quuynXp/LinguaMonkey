package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PronunciationPracticeRequest {
    @NotBlank
    private String audioData;
    
    @NotBlank
    private String referenceText;
    
    @NotBlank
    private String language;
}