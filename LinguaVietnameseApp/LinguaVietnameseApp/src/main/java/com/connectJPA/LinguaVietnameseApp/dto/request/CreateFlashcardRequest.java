package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateFlashcardRequest {
    private UUID lessonId;
    private String front;
    private String back;
    private String example;
    private String imageUrl;
    private String audioUrl;
    private List<String> tags;
}

