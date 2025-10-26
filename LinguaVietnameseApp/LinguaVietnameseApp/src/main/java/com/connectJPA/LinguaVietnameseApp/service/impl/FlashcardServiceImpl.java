package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.FlashcardMapper;
import com.connectJPA.LinguaVietnameseApp.repository.FlashcardRepository;
import com.connectJPA.LinguaVietnameseApp.service.CloudinaryService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class FlashcardServiceImpl implements com.connectJPA.LinguaVietnameseApp.service.FlashcardService {
    private final UserService userService;
    private final FlashcardRepository flashcardRepository;
    private final GrpcClientService grpcClientService;
    private final FlashcardMapper flashcardMapper;
    private final CloudinaryService cloudinaryService;

    @Transactional
    public FlashcardResponse createFlashcard(CreateFlashcardRequest req, UUID creatorId) {
        Flashcard entity = flashcardMapper.toEntity(req);
        entity.setUserId(creatorId);
        entity.setEaseFactor(2.5f);
        entity.setIntervalDays(0);
        entity.setRepetitions(0);
        entity.setDeleted(false);
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setNextReviewAt(OffsetDateTime.now());

        Flashcard saved = flashcardRepository.save(entity);
        return flashcardMapper.toResponse(saved);
    }

    public List<FlashcardResponse> getDueFlashcards(UUID userId, UUID lessonId, int limit) {
        OffsetDateTime now = OffsetDateTime.now();
        List<Flashcard> list;
        if (lessonId != null) {
            list = flashcardRepository
                    .findByUserIdAndLessonIdAndIsDeletedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(userId, lessonId, now, PageRequest.of(0, limit));
        } else {
            list = flashcardRepository
                    .findByUserIdAndIsDeletedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(userId, now, PageRequest.of(0, limit));
        }
        return list.stream().map(flashcardMapper::toResponse).collect(Collectors.toList());
    }


    @Transactional
    public FlashcardResponse reviewFlashcard(UUID flashcardId, int quality, UUID reviewerId) {
        if (quality < 0 || quality > 5) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }
        Flashcard f = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        if (!f.getUserId()
                .equals(reviewerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        OffsetDateTime now = OffsetDateTime.now();

        if (quality < 3) {
            f.setRepetitions(0);
            f.setIntervalDays(1);
            f.setNextReviewAt(now.plusDays(1));
        } else {
            int reps = (f.getRepetitions() == null ? 0 : f.getRepetitions()) + 1;
            float ef = f.getEaseFactor() == null ? 2.5f : f.getEaseFactor();
            ef = Math.max(1.3f, ef + (0.1f - (5 - quality) * (0.08f + (5 - quality) * 0.02f)));
            int interval;
            if (reps == 1) interval = 1;
            else if (reps == 2) interval = 6;
            else interval = Math.round(f.getIntervalDays() * ef);

            f.setRepetitions(reps);
            f.setEaseFactor(ef);
            f.setIntervalDays(interval);
            f.setNextReviewAt(now.plusDays(interval));
        }
        f.setLastReviewedAt(now);

        Flashcard saved = flashcardRepository.save(f);
        return flashcardMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public FlashcardResponse generateTtsAndSave(UUID flashcardId, String text, String language, String token, UUID userId) {
        Flashcard f = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        if (!f.getUserId()
                .equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        byte[] audio = grpcClientService.callGenerateTtsAsync(token, text, language)
                .join();

        String fileName = "tts-" + flashcardId;
        var result = cloudinaryService.uploadBytes(audio, fileName, "tts", "auto");
        String url = (String) result.get("secure_url");

        f.setAudioUrl(url);
        Flashcard saved = flashcardRepository.save(f);
        return flashcardMapper.toResponse(saved);
    }

}