package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.Roadmap;
import com.connectJPA.LinguaVietnameseApp.enums.RoadmapType;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RoadmapResponse {
    private UUID id;
    private String title;
    private String description;
    private String language;
    private List<RoadmapItemResponse> items;
    private List<MilestoneResponse> milestones;
    private List<ResourceResponse> resources;
    private RoadmapType type;
}
