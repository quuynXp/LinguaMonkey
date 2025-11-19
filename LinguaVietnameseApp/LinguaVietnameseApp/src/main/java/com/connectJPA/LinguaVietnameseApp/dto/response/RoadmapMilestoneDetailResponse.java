package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapMilestoneDetailResponse {
    private UUID milestoneId;
    private String title;
    private String description;
    private Integer level;
    private List<String> requirements;
    private List<String> rewards;
    private Integer orderIndex;
    private String status; // LOCKED, AVAILABLE, COMPLETED
    private Integer progressPercentage;
}
