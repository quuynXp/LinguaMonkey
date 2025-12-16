package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StudySessionResponse {
    private UUID id; // activity_id
    private String type; // e.g., "LESSON_COMPLETED", "DAILY_CHALLENGE_COMPLETED"
    private String title;
    private OffsetDateTime date; // created_at
    private Long duration; // duration_in_seconds
    private Float score;
    private Float maxScore;
    private Integer experience;
    private List<String> skills;
    private boolean completed;
}
