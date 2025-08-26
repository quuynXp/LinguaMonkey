package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AssignRoadmapRequest {
    private UUID roadmapId;
    private UUID userId;
}
