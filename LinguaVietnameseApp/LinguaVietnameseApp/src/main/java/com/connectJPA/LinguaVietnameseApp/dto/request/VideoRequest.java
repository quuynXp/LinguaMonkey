package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
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
    private DifficultyLevel level; // A1, A2, ...
    private String originalSubtitleUrl;
    private UUID lessonId;
}
