package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BilingualVideoResponse {
    private UUID videoId;
    private String title;
    private String category;
    private DifficultyLevel level;
    private String url;
    private OffsetDateTime createdAt;
}
