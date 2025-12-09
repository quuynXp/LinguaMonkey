package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapPublicResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapSuggestionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapUserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.RoadmapItem;
import com.connectJPA.LinguaVietnameseApp.entity.RoadmapSuggestion;
import com.connectJPA.LinguaVietnameseApp.service.RoadmapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roadmaps")
@RequiredArgsConstructor
@Tag(name = "Roadmaps", description = "CRUD + AI-generated Roadmaps")
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final MessageSource messageSource;

    private <T> AppApiResponse<T> buildResponse(int code, String messageKey, Locale locale, T result) {
        return AppApiResponse.<T>builder()
                .code(code)
                .message(messageSource.getMessage(messageKey, null, locale))
                .result(result)
                .build();
    }

    @GetMapping("/public/community")
    public AppApiResponse<Page<RoadmapPublicResponse>> getCommunityRoadmaps(
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UUID userId // Add userId to check isFavorite
    ) {
        return AppApiResponse.<Page<RoadmapPublicResponse>>builder()
                .result(roadmapService.getCommunityRoadmaps(language, page, size, userId))
                .build();
    }

    @GetMapping("/public/official")
    public AppApiResponse<Page<RoadmapPublicResponse>> getOfficialRoadmaps(
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UUID userId // Add userId to check isFavorite
    ) {
        return AppApiResponse.<Page<RoadmapPublicResponse>>builder()
                .result(roadmapService.getOfficialRoadmaps(language, page, size, userId))
                .build();
    }

    // --- NEW: TOGGLE FAVORITE ---
    @Operation(summary = "Toggle favorite status for a roadmap")
    @PostMapping("/{roadmapId}/favorite")
    public AppApiResponse<Void> toggleFavorite(
            @PathVariable UUID roadmapId,
            @RequestParam UUID userId,
            Locale locale
    ) {
        boolean isFavorited = roadmapService.toggleFavorite(userId, roadmapId);
        String msgKey = isFavorited ? "roadmap.favorite.added" : "roadmap.favorite.removed";
        return buildResponse(200, msgKey, locale, null);
    }
    // ---------------------------

    @Operation(summary = "Get roadmap details (no user progress)")
    @GetMapping("/{roadmapId}")
    public AppApiResponse<RoadmapResponse> getRoadmap(
            @PathVariable UUID roadmapId,
            Locale locale) {
        RoadmapResponse roadmap = roadmapService.getRoadmapWithDetails(roadmapId);
        return buildResponse(200, "roadmap.get", locale, roadmap);
    }

    @Operation(summary = "Get all public roadmaps (simplified list)")
    @GetMapping("/public")
    public AppApiResponse<List<RoadmapResponse>> getPublicRoadmaps(
            @RequestParam(required = false) String language,
            Locale locale) {
        List<RoadmapResponse> roadmaps = roadmapService.getPublicRoadmaps(language);
        return buildResponse(200, "roadmap.public.list", locale, roadmaps);
    }
    
    @Operation(summary = "Get all public roadmaps with stats and pagination")
    @GetMapping("/public/stats")
    public AppApiResponse<Page<RoadmapPublicResponse>> getPublicRoadmapsWithStats(
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UUID userId, // Add userId
            Locale locale) {
        Page<RoadmapPublicResponse> roadmapsPage = roadmapService.getPublicRoadmapsWithStats(language, page, size, userId);
        return buildResponse(200, "roadmap.public.stats.list", locale, roadmapsPage);
    }

    @Operation(summary = "Get roadmap details for a user")
    @GetMapping("/{roadmapId}/user/{userId}")
    public AppApiResponse<RoadmapUserResponse> getRoadmapForUser(
            @PathVariable UUID roadmapId,
            @PathVariable UUID userId,
            Locale locale) {
        RoadmapUserResponse roadmap = roadmapService.getRoadmapWithUserProgress(roadmapId, userId);
        return buildResponse(200, "roadmap.user.get", locale, roadmap);
    }

    @Operation(summary = "Get all roadmaps for a user")
    @GetMapping("/user/{userId}")
    public AppApiResponse<List<RoadmapUserResponse>> getUserRoadmaps(
            @PathVariable UUID userId,
            @RequestParam(required = false) String language,
            Locale locale) {
        List<RoadmapUserResponse> roadmaps = roadmapService.getUserRoadmaps(userId, language);
        return buildResponse(200, "roadmap.user.list", locale, roadmaps);
    }

    @Operation(summary = "Get all public/default roadmaps")
    @GetMapping
    public AppApiResponse<List<RoadmapResponse>> getAllRoadmaps(
            @RequestParam(required = false) String language,
            Locale locale) {
        List<RoadmapResponse> roadmaps = roadmapService.getAllRoadmaps(language);
        return buildResponse(200, "roadmap.list", locale, roadmaps);
    }

    @Operation(summary = "Create new roadmap manually")
    @PostMapping
    public AppApiResponse<RoadmapResponse> create(
            @RequestBody CreateRoadmapRequest request,
            Locale locale) {
        RoadmapResponse roadmap = roadmapService.create(request);
        return buildResponse(201, "roadmap.create", locale, roadmap);
    }

    @Operation(summary = "Update roadmap")
    @PutMapping("/{id}")
    public AppApiResponse<RoadmapResponse> update(
            @PathVariable UUID id,
            @RequestBody CreateRoadmapRequest request,
            Locale locale) {
        RoadmapResponse roadmap = roadmapService.update(id, request);
        return buildResponse(200, "roadmap.update", locale, roadmap);
    }

    @Operation(summary = "Assign roadmap to user")
    @PostMapping("/assign")
    public AppApiResponse<Void> assignRoadmap(@RequestBody AssignRoadmapRequest req, Locale locale) {
        roadmapService.assignRoadmapToUser(req.getUserId(), req.getRoadmapId());
        return buildResponse(200, "roadmap.assign", locale, null);
    }

    @Operation(summary = "Delete roadmap")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> delete(
            @PathVariable UUID id,
            Locale locale) {
        roadmapService.delete(id);
        return buildResponse(200, "roadmap.delete", locale, null);
    }

    @Operation(summary = "Generate roadmap using AI via gRPC")
    @PostMapping("/generate")
    public AppApiResponse<RoadmapResponse> generateByAI(
            @RequestHeader("Authorization") String token,
            @RequestBody GenerateRoadmapRequest request,
            Locale locale) {
        RoadmapResponse roadmap = roadmapService.generateFromAI(token, request);
        return buildResponse(200, "roadmap.generate", locale, roadmap);
    }

    @Operation(summary = "Get roadmap item detail")
    @GetMapping("/items/{itemId}")
    public AppApiResponse<RoadmapItem> getItemDetail(
            @PathVariable UUID itemId,
            Locale locale
    ) {
        RoadmapItem detail = roadmapService.getRoadmapItemDetail(itemId);
        return buildResponse(200, "roadmap.item.get", locale, detail);
    }

    @Operation(summary = "Mark roadmap item as started")
    @PostMapping("/items/start")
    public AppApiResponse<Void> startItem(
            @RequestBody StartCompleteRoadmapItemRequest req,
            Locale locale
    ) {
        roadmapService.startItem(req.getUserId(), req.getItemId());
        return buildResponse(200, "roadmap.item.start", locale, null);
    }

    @Operation(summary = "Mark roadmap item as completed")
    @PostMapping("/items/complete")
    public AppApiResponse<Void> completeItem(
            @RequestBody StartCompleteRoadmapItemRequest req,
            Locale locale
    ) {
        roadmapService.completeItem(req.getUserId(), req.getItemId());
        return buildResponse(200, "roadmap.item.complete", locale, null);
    }

    @Operation(summary = "Set roadmap public/private")
    @PutMapping("/{roadmapId}/public")
    public AppApiResponse<Void> setPublic(
            @PathVariable UUID roadmapId,
            @RequestParam UUID userId,
            @RequestParam boolean isPublic,
            Locale locale) {
        roadmapService.setPublic(userId, roadmapId, isPublic);
        return buildResponse(200, "roadmap.public.update", locale, null);
    }

    @Operation(summary = "Add suggestion to public roadmap")
    @PostMapping("/{roadmapId}/suggestions")
    public AppApiResponse<RoadmapSuggestion> addSuggestion(
            @PathVariable UUID roadmapId,
            @RequestBody AddSuggestionRequest req,
            Locale locale) {
        RoadmapSuggestion suggestion = roadmapService.addSuggestion(req.getUserId(), roadmapId, req.getItemId(), req.getSuggestedOrderIndex(), req.getReason());
        return buildResponse(201, "roadmap.suggestion.add", locale, suggestion);
    }

    @Operation(summary = "Apply suggestion (owner only)")
    @PutMapping("/suggestions/{suggestionId}/apply")
    public AppApiResponse<Void> applySuggestion(
            @PathVariable UUID suggestionId,
            @RequestParam UUID userId,
            Locale locale) {
        roadmapService.applySuggestion(userId, suggestionId);
        return buildResponse(200, "roadmap.suggestion.apply", locale, null);
    }

    @Operation(summary = "Get suggestions for roadmap (simplified list)")
    @GetMapping("/{roadmapId}/suggestions")
    public AppApiResponse<List<RoadmapSuggestion>> getSuggestions(
            @PathVariable UUID roadmapId,
            Locale locale) {
        List<RoadmapSuggestion> suggestions = roadmapService.getSuggestions(roadmapId); 
        return buildResponse(200, "roadmap.suggestion.list", locale, suggestions);
    }
    
    @Operation(summary = "Get suggestions for roadmap with user/item details")
    @GetMapping("/{roadmapId}/suggestions/details")
    public AppApiResponse<List<RoadmapSuggestionResponse>> getSuggestionsWithDetails(
            @PathVariable UUID roadmapId,
            Locale locale) {
        List<RoadmapSuggestionResponse> suggestions = roadmapService.getSuggestionsWithDetails(roadmapId); 
        return buildResponse(200, "roadmap.suggestion.list", locale, suggestions);
    }
}