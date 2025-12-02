package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardResponse {
    private UUID flashcardId;
    private UUID lessonId;
    private UUID userId; // Added field to identify owner
    private String front;
    private String back;
    private String exampleSentence;
    private String imageUrl;
    private String audioUrl;
    private OffsetDateTime nextReviewAt;
    private Integer intervalDays;
    private Integer repetitions;
    private Float easeFactor;
    private String tags;
    private Boolean isPublic;
}