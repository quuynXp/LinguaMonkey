package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.AssignRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.CreateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.GenerateRoadmapRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoadmapUserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.RoadmapItem;
import com.connectJPA.LinguaVietnameseApp.service.RoadmapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/roadmaps")
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

    @Operation(summary = "Get roadmap details (no user progress)")
    @GetMapping("/{roadmapId}")
    public AppApiResponse<RoadmapResponse> getRoadmap(
            @PathVariable UUID roadmapId,
            Locale locale) {
        RoadmapResponse roadmap = roadmapService.getRoadmapWithDetails(roadmapId);
        return buildResponse(200, "roadmap.get", locale, roadmap);
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

    @Operation(summary = "Assign roadmap to user (choose default or assign generated)")
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
            @RequestParam UUID userId,
            @RequestParam UUID itemId,
            Locale locale
    ) {
        roadmapService.startItem(userId, itemId);
        return buildResponse(200, "roadmap.item.start", locale, null);
    }

    @Operation(summary = "Mark roadmap item as completed")
    @PostMapping("/items/complete")
    public AppApiResponse<Void> completeItem(
            @RequestParam UUID userId,
            @RequestParam UUID itemId,
            Locale locale
    ) {
        roadmapService.completeItem(userId, itemId);
        return buildResponse(200, "roadmap.item.complete", locale, null);
    }

}
