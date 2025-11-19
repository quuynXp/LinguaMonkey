package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapSuggestionResponse {
    private UUID suggestionId;
    private UUID userId;
    private String userName;
    private String userAvatar;
    private UUID roadmapId;
    private UUID itemId;
    private Integer suggestedOrderIndex;
    private String reason;
    private Integer appliedCount;
    private Integer likeCount;
    private Boolean applied;
    private Boolean userLiked;
    private OffsetDateTime createdAt;
    private OffsetDateTime appliedAt;
}
