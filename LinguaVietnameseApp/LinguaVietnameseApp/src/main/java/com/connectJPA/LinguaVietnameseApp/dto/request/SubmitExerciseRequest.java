package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class SubmitExerciseRequest {
    private UUID ruleId;
    private UUID userId;
    private Map<String, String> answers;
}
