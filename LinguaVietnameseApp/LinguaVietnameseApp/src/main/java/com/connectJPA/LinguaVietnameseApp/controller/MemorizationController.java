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
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/memorizations")
@RequiredArgsConstructor
public class MemorizationController {
    private final UserMemorizationService memorizationService;
    private final MessageSource messageSource;

    @Operation(summary = "Save a memorization item")
    @PostMapping
    public AppApiResponse<MemorizationResponse> saveMemorization(
            @RequestBody MemorizationRequest request,
            Locale locale) {
        MemorizationResponse response = memorizationService.saveMemorization(request, request.getUserId());
        return AppApiResponse.<MemorizationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.create.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Update a memorization item")
    @PutMapping("/{memorizationId}")
    public AppApiResponse<MemorizationResponse> updateMemorization(
            @PathVariable UUID memorizationId,
            @RequestBody MemorizationRequest request,
            Locale locale) {
        // Lấy userId trực tiếp từ Request Body
        MemorizationResponse response = memorizationService.updateMemorization(memorizationId, request, request.getUserId());
        return AppApiResponse.<MemorizationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.update.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Delete a memorization item")
    @DeleteMapping("/{memorizationId}")
    public AppApiResponse<Void> deleteMemorization(
            @PathVariable UUID memorizationId,
            @RequestParam UUID userId, 
            Locale locale) {
        memorizationService.deleteMemorization(memorizationId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.delete.success", null, locale))
                .build();
    }

    @Operation(summary = "Get memorization items")
    @GetMapping
    public AppApiResponse<Page<MemorizationResponse>> getMemorizations(
            @RequestParam UUID userId, 
            @RequestParam(required = false) String contentType,
            Pageable pageable,
            Locale locale) {
        Page<MemorizationResponse> memorizations = memorizationService.getMemorizationsByUser(userId, contentType, pageable);
        return AppApiResponse.<Page<MemorizationResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("memorization.list.success", null, locale))
                .result(memorizations)
                .build();
    }
}