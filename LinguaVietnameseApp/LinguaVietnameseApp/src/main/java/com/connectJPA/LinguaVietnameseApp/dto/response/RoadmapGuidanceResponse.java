package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapGuidanceResponse {
    private UUID guidanceId;
    private String stage;
    private String title;
    private String description;
    private List<String> tips;
    private Integer estimatedTime;
    private Integer orderIndex;
}
