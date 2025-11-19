package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapItemDetailResponse {
    private UUID itemId;
    private String title;
    private String description;
    private String type;
    private Integer level;
    private Integer estimatedTime;
    private Integer expReward;
    private String difficulty;
    private String category;
    private UUID contentId;
    private List<String> skills;
    private List<ResourceResponse> resources;
    private List<RoadmapGuidanceResponse> guidances;
}
