package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface FlashcardService {

    Page<FlashcardResponse> getFlashcardsByLesson(UUID userId, UUID lessonId, String query, int page, int size);

    FlashcardResponse getFlashcard(UUID id, UUID userId);

    public FlashcardResponse createFlashcard(CreateFlashcardRequest req, UUID creatorId);

    @Transactional
    FlashcardResponse updateFlashcard(UUID id, CreateFlashcardRequest req, UUID userId);

    @Transactional
    void deleteFlashcard(UUID id, UUID userId);

    public List<FlashcardResponse> getDueFlashcards(UUID userId, UUID lessonId, int limit);

    public FlashcardResponse reviewFlashcard(UUID flashcardId, int quality, UUID reviewerId);

    @Transactional
    FlashcardResponse resetProgress(UUID flashcardId, UUID userId);

    @Transactional
    FlashcardResponse toggleSuspend(UUID flashcardId, UUID userId);

    public FlashcardResponse generateTtsAndSave(UUID flashcardId, String text, String language, String token, UUID userId);
}

