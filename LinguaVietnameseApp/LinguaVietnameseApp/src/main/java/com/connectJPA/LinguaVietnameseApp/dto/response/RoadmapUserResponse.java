package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RoadmapUserResponse {
    private UUID roadmapId;
    private UUID userId;
    private String title;
    private String description;
    private String language;
    private int progressPercentage;

    private int totalItems;
    private int completedItems;
    private int estimatedCompletionTime;

    private List<RoadmapItemUserResponse> items;  // item + trạng thái completed/ongoing
    private List<MilestoneUserResponse> milestones; // milestone + completed flag
}
