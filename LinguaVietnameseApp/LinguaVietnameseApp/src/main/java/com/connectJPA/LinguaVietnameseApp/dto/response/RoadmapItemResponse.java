package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapItemResponse {
    private UUID id;
    private String name;
    private String description;
    private String type;
    private Integer level;
    private Integer estimatedTime;
    private Integer expReward;
    private String difficulty;
    private String category;
    private Integer orderIndex;
    private List<ResourceResponse> resources;
}