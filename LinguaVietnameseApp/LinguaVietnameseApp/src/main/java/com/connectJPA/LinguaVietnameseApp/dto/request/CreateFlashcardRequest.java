package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateFlashcardRequest {
    private UUID lessonId;
    private String front;
    private String back;
    private String exampleSentence;
    private String imageUrl;
    private String audioUrl;
    private String tags;
    private Boolean isPublic;
}