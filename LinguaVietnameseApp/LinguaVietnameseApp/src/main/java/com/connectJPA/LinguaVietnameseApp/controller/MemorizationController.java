package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.MemorizationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemorizationResponse;
import com.connectJPA.LinguaVietnameseApp.service.UserMemorizationService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/memorizations")
@RequiredArgsConstructor
public class MemorizationController {
    private final UserMemorizationService memorizationService;
    private final MessageSource messageSource;

    @Operation(summary = "Save a memorization item", description = "Save a note, event, lesson, video, vocabulary, or formula for a user")
    @PostMapping
    public AppApiResponse<MemorizationResponse> saveMemorization(
            @RequestBody MemorizationRequest request,
            Principal principal,
            Locale locale) {
        UUID authenticatedUserId = UUID.fromString(principal.getName());
        MemorizationResponse response = memorizationService.saveMemorization(request, authenticatedUserId);
        return AppApiResponse.<MemorizationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.create.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Update a memorization item", description = "Update an existing memorization item")
    @PutMapping("/{memorizationId}")
    public AppApiResponse<MemorizationResponse> updateMemorization(
            @PathVariable UUID memorizationId,
            @RequestBody MemorizationRequest request,
            Principal principal,
            Locale locale) {
        UUID authenticatedUserId = UUID.fromString(principal.getName());
        MemorizationResponse response = memorizationService.updateMemorization(memorizationId, request, authenticatedUserId);
        return AppApiResponse.<MemorizationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.update.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Delete a memorization item", description = "Soft delete a memorization item")
    @DeleteMapping("/{memorizationId}")
    public AppApiResponse<Void> deleteMemorization(
            @PathVariable UUID memorizationId,
            Principal principal,
            Locale locale) {
        UUID authenticatedUserId = UUID.fromString(principal.getName());
        memorizationService.deleteMemorization(memorizationId, authenticatedUserId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.delete.success", null, locale))
                .build();
    }

    @Operation(summary = "Get memorization items", description = "Get paginated memorization items for a user, optionally filtered by content type")
    @GetMapping
    public AppApiResponse<Page<MemorizationResponse>> getMemorizations(
            @RequestParam(required = false) String contentType,
            Pageable pageable,
            Principal principal,
            Locale locale) {
        UUID authenticatedUserId = UUID.fromString(principal.getName());
        Page<MemorizationResponse> memorizations = memorizationService.getMemorizationsByUser(authenticatedUserId, contentType, pageable);
        return AppApiResponse.<Page<MemorizationResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.list.success", null, locale))
                .result(memorizations)
                .build();
    }
}