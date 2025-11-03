package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class StudySessionResponse {
    private UUID id; // activity_id
    private String type; // e.g., "LESSON_COMPLETED", "DAILY_CHALLENGE_COMPLETED"
    private String title;
    private Instant date; // created_at
    private Integer duration; // duration_in_seconds
    private Integer score;
    private Integer maxScore;
    private Integer experience;
    private List<String> skills;
    private boolean completed;
}
