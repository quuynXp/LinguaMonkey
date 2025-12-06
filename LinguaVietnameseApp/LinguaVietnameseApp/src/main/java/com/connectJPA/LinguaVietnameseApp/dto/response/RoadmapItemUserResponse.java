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
public class RoadmapItemUserResponse {
    private UUID id;
    private String name;
    private String description;
    private Boolean completed;
    private Integer progress;
    private String status;
    private List<ResourceResponse> resources;
}