package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.GenerateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapPublicResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapSuggestionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapUserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.RoadmapItem;
import com.connectJPA.LinguaVietnameseApp.entity.RoadmapSuggestion;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface RoadmapService {
    // User Roadmaps
    List<RoadmapUserResponse> getUserRoadmaps(UUID userId, String language);
    RoadmapUserResponse getRoadmapWithUserProgress(UUID roadmapId, UUID userId);
    void assignRoadmapToUser(UUID userId, UUID roadmapId);

    // Public Roadmaps
    List<RoadmapResponse> getPublicRoadmaps(String language);
    Page<RoadmapPublicResponse> getPublicRoadmapsWithStats(String language, int page, int size);
    void setPublic(UUID userId, UUID roadmapId, boolean isPublic);

    // Suggestions
    List<RoadmapSuggestion> getSuggestions(UUID roadmapId);
    List<RoadmapSuggestionResponse> getSuggestionsWithDetails(UUID roadmapId);
    RoadmapSuggestion addSuggestion(UUID userId, UUID roadmapId, UUID itemId, Integer suggestedOrderIndex, String reason);
    void applySuggestion(UUID userId, UUID suggestionId);

    // Roadmap CRUD
    List<RoadmapResponse> getAllRoadmaps(String language);
    RoadmapResponse getRoadmapWithDetails(UUID roadmapId);
    RoadmapResponse create(CreateRoadmapRequest request);
    RoadmapResponse update(UUID id, CreateRoadmapRequest request);
    void delete(UUID id);

    // Items
    void startItem(UUID userId, UUID itemId);
    void completeItem(UUID userId, UUID itemId);
    RoadmapItem getRoadmapItemDetail(UUID itemId);

    // AI Generation
    RoadmapResponse generateFromAI(String token, GenerateRoadmapRequest req);
//    RoadmapResponse create(CreateRoadmapRequest request);
//
//    List<RoadmapSuggestion> getSuggestions(UUID roadmapId);
//
//    List<RoadmapResponse> getPublicRoadmaps(String language);
//
//    Page<RoadmapPublicResponse> getPublicRoadmapsWithStats(String language, int page, int size);
//
//    @Transactional
//    void setPublic(UUID userId, UUID roadmapId, boolean isPublic);
//
//    List<RoadmapSuggestionResponse> getSuggestionsWithDetails(UUID roadmapId);
//
//    @Transactional
//    RoadmapSuggestion addSuggestion(UUID userId, UUID roadmapId, UUID itemId, Integer suggestedOrderIndex, String reason);
//
//    @Transactional
//    void applySuggestion(UUID userId, UUID suggestionId);
//
//    RoadmapResponse update(UUID id, CreateRoadmapRequest request);
//
//    void delete(UUID id);
//
//    RoadmapResponse getRoadmapWithDetails(UUID roadmapId);
//
//    List<RoadmapResponse> getAllRoadmaps(String language);
//
//    RoadmapUserResponse getRoadmapWithUserProgress(UUID roadmapId, UUID userId);
//
//    void assignRoadmapToUser(UUID userId, UUID roadmapId);
//
//    List<RoadmapUserResponse> getUserRoadmaps(UUID userId, String language);
//
//    RoadmapResponse generateFromAI(String token, GenerateRoadmapRequest request);
//
//    RoadmapItem getRoadmapItemDetail(UUID itemId);
//    void startItem(UUID userId, UUID itemId);
//    void completeItem(UUID userId, UUID itemId);

}