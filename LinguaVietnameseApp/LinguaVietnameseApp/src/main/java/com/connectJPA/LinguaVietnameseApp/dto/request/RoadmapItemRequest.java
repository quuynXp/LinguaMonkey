package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapItemRequest {
    private String title;
    private String description;
    private Integer estimatedTime;
    private Integer orderIndex;
    private List<ResourceRequest> resources;
}