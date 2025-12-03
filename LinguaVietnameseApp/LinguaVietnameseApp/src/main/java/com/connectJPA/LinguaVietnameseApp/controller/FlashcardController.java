package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.FlashcardService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lessons/{lessonId}/flashcards")
@RequiredArgsConstructor
public class FlashcardController {
    private final FlashcardService flashcardService;
    private final AuthenticationService auth;
    private final UserLearningActivityService userLearningActivityService;

    private String extractToken(String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        throw new IllegalArgumentException("Invalid Authorization header");
    }

    @GetMapping("/my")
    public AppApiResponse<Page<FlashcardResponse>> getMyFlashcards(
            @PathVariable UUID lessonId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String query,
            @RequestHeader("Authorization") String authorization) {
        
        UUID tokenUserId = auth.extractTokenByUserId(extractToken(authorization));
        Page<FlashcardResponse> result = flashcardService.getMyFlashcards(tokenUserId, lessonId, query, page, size);
        return AppApiResponse.<Page<FlashcardResponse>>builder()
                .code(200)
                .message("OK")
                .result(result)
                .build();
    }

    @GetMapping("/community")
    public AppApiResponse<Page<FlashcardResponse>> getCommunityFlashcards(
            @PathVariable UUID lessonId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "popular") String sort,
            @RequestHeader("Authorization") String authorization) {
        
        // Validate token exists, even if logic handles public data
        auth.extractTokenByUserId(extractToken(authorization));
        
        Page<FlashcardResponse> result = flashcardService.getCommunityFlashcards(lessonId, query, page, size, sort);
        return AppApiResponse.<Page<FlashcardResponse>>builder()
                .code(200)
                .message("OK")
                .result(result)
                .build();
    }

    @GetMapping("/{id}")
    public AppApiResponse<FlashcardResponse> getFlashcard(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse response = flashcardService.getFlashcard(id, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("OK")
                .result(response)
                .build();
    }

    @GetMapping("/due")
    public AppApiResponse<List<FlashcardResponse>> getDueFlashcards(
            @PathVariable UUID lessonId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        List<FlashcardResponse> list = flashcardService.getDueFlashcards(userId, lessonId, limit);
        return AppApiResponse.<List<FlashcardResponse>>builder()
                .code(200)
                .message("OK")
                .result(list)
                .build();
    }

    @PostMapping
    public AppApiResponse<FlashcardResponse> createFlashcard(
            @PathVariable UUID lessonId,
            @RequestBody CreateFlashcardRequest req,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        req.setLessonId(lessonId);
        FlashcardResponse created = flashcardService.createFlashcard(req, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(201)
                .message("Flashcard created")
                .result(created)
                .build();
    }

    @PostMapping("/{id}/claim")
    public AppApiResponse<FlashcardResponse> claimFlashcard(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse response = flashcardService.claimFlashcard(id, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("Card Claimed")
                .result(response)
                .build();
    }

    @PutMapping("/{id}")
    public AppApiResponse<FlashcardResponse> updateFlashcard(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestBody CreateFlashcardRequest req,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse updated = flashcardService.updateFlashcard(id, req, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("Flashcard updated")
                .result(updated)
                .build();
    }

    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteFlashcard(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        flashcardService.deleteFlashcard(id, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Flashcard deleted")
                .build();
    }

    @PostMapping("/{id}/review")
    public AppApiResponse<FlashcardResponse> review(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestParam int quality,
            @RequestParam(defaultValue = "0") int duration,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse reviewed = flashcardService.reviewFlashcard(id, quality, userId);

        userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                .userId(userId)
                .activityType(ActivityType.FLASHCARD_REVIEW)
                .relatedEntityId(id)
                .durationInSeconds(duration)
                .details("Review Quality: " + quality)
                .build());

        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("Flashcard reviewed")
                .result(reviewed)
                .build();
    }

    @PostMapping("/{id}/reset")
    public AppApiResponse<FlashcardResponse> resetProgress(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse response = flashcardService.resetProgress(id, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("Progress reset")
                .result(response)
                .build();
    }

    @PostMapping("/{id}/suspend")
    public AppApiResponse<FlashcardResponse> toggleSuspend(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse response = flashcardService.toggleSuspend(id, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("Suspend status toggled")
                .result(response)
                .build();
    }

    @PostMapping("/{id}/tts")
    public AppApiResponse<FlashcardResponse> generateTts(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestHeader("Authorization") String authorization,
            @RequestParam String languageCode) {
        String token = extractToken(authorization);
        UUID userId = auth.extractTokenByUserId(token);
        FlashcardResponse response = flashcardService.generateTtsAndSave(id, null, languageCode, token, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("TTS generated")
                .result(response)
                .build();
    }
}