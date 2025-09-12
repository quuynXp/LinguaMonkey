package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

import java.util.UUID;

@Data
public class LessonStatsResponse {
    private UUID lessonId;
    private String lessonName;
    private int expReward;
    private long completions;
}
