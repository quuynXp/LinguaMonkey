package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class TestSubmissionRequest {
    // Key: questionId, Value: answerIndex
    private Map<UUID, Integer> answers;
}