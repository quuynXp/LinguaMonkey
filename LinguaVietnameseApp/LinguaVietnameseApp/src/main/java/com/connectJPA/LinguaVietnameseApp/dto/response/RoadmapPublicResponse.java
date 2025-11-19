package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapPublicResponse {
    private UUID roadmapId;
    private String title;
    private String description;
    private String language;
    private String creator;
    private UUID creatorId;
    private String creatorAvatar;
    private Integer totalItems;
    private Integer suggestionCount;
    private Double averageRating;
    private String difficulty;
    private String type;
    private OffsetDateTime createdAt;
    private Integer viewCount;
    private Integer favoriteCount;
}
