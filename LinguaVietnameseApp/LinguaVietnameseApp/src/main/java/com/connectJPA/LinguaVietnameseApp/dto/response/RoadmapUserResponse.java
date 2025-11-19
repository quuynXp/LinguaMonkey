package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.RoadmapType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapUserResponse {
    private UUID roadmapId;
    private UUID userId;
    private String title;
    private String description;
    private String language;
    private Integer progressPercentage;
    private Integer totalItems;
    private Integer completedItems;
    private Integer estimatedCompletionTime;
    private String status;
    private List<RoadmapItemUserResponse> items;
    private List<MilestoneUserResponse> milestones;
    private OffsetDateTime createdAt;
}
