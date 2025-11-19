package com.connectJPA.LinguaVietnameseApp.dto.response;


import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapPublicDetailResponse {
    private UUID roadmapId;
    private String title;
    private String description;
    private String language;
    private String creator;
    private UUID creatorId;
    private String creatorAvatar;
    private Integer totalItems;
    private List<RoadmapItemResponse> items;
    private List<MilestoneResponse> milestones;
    private Double averageRating;
    private Integer viewCount;
    private Integer favoriteCount;
    private Boolean isPublic;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<RoadmapSuggestionResponse> suggestions;
}