package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapSuggestionDetailResponse {
    private UUID suggestionId;
    private UUID userId;
    private String userName;
    private String userAvatar;
    private Integer userLevel;
    private UUID roadmapId;
    private String roadmapTitle;
    private UUID itemId;
    private String itemTitle;
    private Integer suggestedOrderIndex;
    private String reason;
    private Integer likeCount;
    private Integer viewCount;
    private Boolean applied;
    private Boolean userLiked;
    private OffsetDateTime createdAt;
    private OffsetDateTime appliedAt;
    private String status; // PENDING, ACCEPTED, REJECTED
}
