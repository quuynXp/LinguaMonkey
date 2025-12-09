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

import java.util.List;
import java.util.UUID;

public interface RoadmapService {
    List<RoadmapUserResponse> getUserRoadmaps(UUID userId, String language);
    RoadmapUserResponse getRoadmapWithUserProgress(UUID roadmapId, UUID userId);
    void assignRoadmapToUser(UUID userId, UUID roadmapId);
    List<RoadmapResponse> getPublicRoadmaps(String language);
    
    Page<RoadmapPublicResponse> getPublicRoadmapsWithStats(String language, int page, int size, UUID userId);
    
    void setPublic(UUID userId, UUID roadmapId, boolean isPublic);
    
    List<RoadmapSuggestion> getSuggestions(UUID roadmapId);
    List<RoadmapSuggestionResponse> getSuggestionsWithDetails(UUID roadmapId); 
    RoadmapSuggestion addSuggestion(UUID userId, UUID roadmapId, UUID itemId, Integer suggestedOrderIndex, String reason);
    void applySuggestion(UUID userId, UUID suggestionId);

    List<RoadmapResponse> getAllRoadmaps(String language);
    RoadmapResponse getRoadmapWithDetails(UUID roadmapId);
    RoadmapResponse create(CreateRoadmapRequest request);
    RoadmapResponse update(UUID id, CreateRoadmapRequest request);
    void delete(UUID id);
    void startItem(UUID userId, UUID itemId);
    void completeItem(UUID userId, UUID itemId);
    RoadmapItem getRoadmapItemDetail(UUID itemId);
    RoadmapResponse generateFromAI(String token, GenerateRoadmapRequest req);

    Page<RoadmapPublicResponse> getOfficialRoadmaps(String language, int page, int size, UUID userId);
    
    Page<RoadmapPublicResponse> getCommunityRoadmaps(String language, int page, int size, UUID userId);
    
    boolean toggleFavorite(UUID userId, UUID roadmapId);

}