package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}