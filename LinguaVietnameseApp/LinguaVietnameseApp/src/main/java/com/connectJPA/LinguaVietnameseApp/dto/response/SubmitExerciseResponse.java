package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class SubmitExerciseResponse {
    private int score;
    private int total;
    private int correct;
    private Map<UUID, Boolean> details;
}
