package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VideoResponse {
    private UUID videoId;
    private String videoUrl;
    private String title;
    private String type;
    private DifficultyLevel level;
    private String originalSubtitleUrl;
    private UUID lessonId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<VideoSubtitleResponse> subtitles;
}
