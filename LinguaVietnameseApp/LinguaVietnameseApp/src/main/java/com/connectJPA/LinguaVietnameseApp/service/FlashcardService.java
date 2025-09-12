package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;

import java.util.List;
import java.util.UUID;

public interface FlashcardService {

    public FlashcardResponse createFlashcard(CreateFlashcardRequest req, UUID creatorId);

    public List<FlashcardResponse> getDueFlashcards(UUID userId, UUID lessonId, int limit);

    public FlashcardResponse reviewFlashcard(UUID flashcardId, int quality, UUID reviewerId);

    public FlashcardResponse generateTtsAndSave(UUID flashcardId, String text, String language, String token, UUID userId);
}

