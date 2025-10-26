package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.FlashcardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/lessons/{lessonId}/flashcards")
@RequiredArgsConstructor
public class FlashcardController {
    private final FlashcardService flashcardService;
    private final AuthenticationService auth;

    private String extractToken(String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        throw new IllegalArgumentException("Invalid Authorization header");
    }

    @GetMapping("/due")
    public AppApiResponse<List<FlashcardResponse>> getDueFlashcards(
            @RequestParam(required = false) UUID lessonId,
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

    @PostMapping("/{id}/review")
    public AppApiResponse<FlashcardResponse> review(
            @PathVariable UUID lessonId,
            @PathVariable UUID id,
            @RequestParam int quality,
            @RequestHeader("Authorization") String authorization) {
        UUID userId = auth.extractTokenByUserId(extractToken(authorization));
        FlashcardResponse reviewed = flashcardService.reviewFlashcard(id, quality, userId);
        return AppApiResponse.<FlashcardResponse>builder()
                .code(200)
                .message("Flashcard reviewed")
                .result(reviewed)
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