package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VideoRequest {
    private String videoUrl;
    private String title;
    private String type; // ANIME, ANIMAL ...
    private String level; // A1, A2, ...
    private String originalSubtitleUrl;
    private UUID lessonId;
}
