package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.GenerateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapUserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.RoadmapItem;

import java.util.List;
import java.util.UUID;

public interface RoadmapService {
    RoadmapResponse create(CreateRoadmapRequest request);

    RoadmapResponse update(UUID id, CreateRoadmapRequest request);

    void delete(UUID id);

    RoadmapResponse getRoadmapWithDetails(UUID roadmapId);

    List<RoadmapResponse> getAllRoadmaps(String language);

    RoadmapUserResponse getRoadmapWithUserProgress(UUID roadmapId, UUID userId);

    void assignRoadmapToUser(UUID userId, UUID roadmapId);

    List<RoadmapUserResponse> getUserRoadmaps(UUID userId, String language);

    RoadmapResponse generateFromAI(String token, GenerateRoadmapRequest request);

    RoadmapItem getRoadmapItemDetail(UUID itemId);
    void startItem(UUID userId, UUID itemId);
    void completeItem(UUID userId, UUID itemId);

}