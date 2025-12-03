package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface FlashcardService {
    Page<FlashcardResponse> getMyFlashcards(UUID userId, UUID lessonId, String query, int page, int size);
    Page<FlashcardResponse> getCommunityFlashcards(UUID lessonId, String query, int page, int size, String sort);
    FlashcardResponse getFlashcard(UUID id, UUID userId);
    FlashcardResponse createFlashcard(CreateFlashcardRequest req, UUID creatorId);
    FlashcardResponse updateFlashcard(UUID id, CreateFlashcardRequest req, UUID userId);
    void deleteFlashcard(UUID id, UUID userId);
    List<FlashcardResponse> getDueFlashcards(UUID userId, UUID lessonId, int limit);
    FlashcardResponse reviewFlashcard(UUID flashcardId, int quality, UUID reviewerId);
    FlashcardResponse resetProgress(UUID flashcardId, UUID userId);
    FlashcardResponse toggleSuspend(UUID flashcardId, UUID userId);
    FlashcardResponse generateTtsAndSave(UUID flashcardId, String text, String language, String token, UUID userId);
    
    // New Method
    FlashcardResponse claimFlashcard(UUID flashcardId, UUID userId);
}