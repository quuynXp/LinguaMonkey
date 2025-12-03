package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.FlashcardMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FlashcardRepository;
import com.connectJPA.LinguaVietnameseApp.service.CloudinaryService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

    @Override
    public Page<FlashcardResponse> getMyFlashcards(UUID userId, UUID lessonId, String query, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Flashcard> flashcards;
        if (query != null && !query.isEmpty()) {
            flashcards = flashcardRepository.searchMyFlashcards(lessonId, userId, query, pageable);
        } else {
            flashcards = flashcardRepository.findMyFlashcards(lessonId, userId, pageable);
        }
        return flashcards.map(flashcardMapper::toResponse);
    }

    @Override
    public Page<FlashcardResponse> getCommunityFlashcards(UUID lessonId, String query, int page, int size, String sort) {
        Sort sortObj = Sort.by(Sort.Direction.DESC, "claimCount"); // Default popular
        if ("newest".equalsIgnoreCase(sort)) {
            sortObj = Sort.by(Sort.Direction.DESC, "createdAt");
        }
        
        PageRequest pageable = PageRequest.of(page, size, sortObj);
        Page<Flashcard> flashcards;
        
        if (query != null && !query.isEmpty()) {
            flashcards = flashcardRepository.searchCommunityFlashcards(lessonId, query, pageable);
        } else {
            flashcards = flashcardRepository.findCommunityFlashcards(lessonId, pageable);
        }
        
        // Enrich with User Profile
        return flashcards.map(f -> {
            FlashcardResponse res = flashcardMapper.toResponse(f);
            try {
                // FIXED: getUserProfile requires (viewerId, targetId). 
                // Passed null as viewerId since this is a public list view.
                UserProfileResponse profile = userService.getUserProfile(null, f.getUserId());
                res.setAuthorProfile(profile);
            } catch (Exception e) {
                res.setAuthorProfile(null);
            }
            return res;
        });
    }

    @Override
    public FlashcardResponse getFlashcard(UUID id, UUID userId) {
        Flashcard f = flashcardRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        
        boolean isOwner = f.getUserId().equals(userId);
        boolean isPublic = Boolean.TRUE.equals(f.getIsPublic());

        if (!isOwner && !isPublic) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return flashcardMapper.toResponse(f);
    }

    @Override
    @Transactional
    public FlashcardResponse createFlashcard(CreateFlashcardRequest req, UUID creatorId) {
        Flashcard entity = flashcardMapper.toEntity(req);
        entity.setUserId(creatorId);
        entity.setEaseFactor(2.5f);
        entity.setIntervalDays(0);
        entity.setRepetitions(0);
        entity.setIsSuspended(false);
        entity.setDeleted(false);
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setNextReviewAt(OffsetDateTime.now());
        entity.setClaimCount(0);
        
        entity.setIsPublic(req.getIsPublic() != null ? req.getIsPublic() : true);

        Flashcard saved = flashcardRepository.save(entity);
        return flashcardMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public FlashcardResponse claimFlashcard(UUID flashcardId, UUID userId) {
        Flashcard source = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));

        if (source.getUserId().equals(userId)) {
             return flashcardMapper.toResponse(source);
        }

        source.setClaimCount((source.getClaimCount() == null ? 0 : source.getClaimCount()) + 1);
        flashcardRepository.save(source);

        Flashcard copy = Flashcard.builder()
                .lessonId(source.getLessonId())
                .userId(userId)
                .front(source.getFront())
                .back(source.getBack())
                .exampleSentence(source.getExampleSentence())
                .imageUrl(source.getImageUrl())
                .audioUrl(source.getAudioUrl())
                .tags(source.getTags())
                .isPublic(false)
                .isDeleted(false)
                .isSuspended(false)
                .easeFactor(2.5f)
                .intervalDays(0)
                .repetitions(0)
                .claimCount(0)
                .createdAt(OffsetDateTime.now())
                .nextReviewAt(OffsetDateTime.now())
                .build();

        Flashcard savedCopy = flashcardRepository.save(copy);
        return flashcardMapper.toResponse(savedCopy);
    }

    @Transactional
    @Override
    public FlashcardResponse updateFlashcard(UUID id, CreateFlashcardRequest req, UUID userId) {
        Flashcard f = flashcardRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        
        if (!f.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        f.setFront(req.getFront());
        f.setBack(req.getBack());
        f.setExampleSentence(req.getExampleSentence());
        f.setImageUrl(req.getImageUrl());
        f.setTags(req.getTags());
        
        if (req.getIsPublic() != null) {
            f.setIsPublic(req.getIsPublic());
        }
        
        Flashcard saved = flashcardRepository.save(f);
        return flashcardMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public void deleteFlashcard(UUID id, UUID userId) {
        Flashcard f = flashcardRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        if (!f.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        f.setDeleted(true);
        flashcardRepository.save(f);
    }

    @Override
    public List<FlashcardResponse> getDueFlashcards(UUID userId, UUID lessonId, int limit) {
        OffsetDateTime now = OffsetDateTime.now();
        List<Flashcard> list;
        if (lessonId != null) {
            list = flashcardRepository
                    .findByUserIdAndLessonIdAndIsDeletedFalseAndIsSuspendedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(userId, lessonId, now, PageRequest.of(0, limit));
        } else {
            list = flashcardRepository
                    .findByUserIdAndIsDeletedFalseAndIsSuspendedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(userId, now, PageRequest.of(0, limit));
        }
        return list.stream().map(flashcardMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FlashcardResponse reviewFlashcard(UUID flashcardId, int quality, UUID reviewerId) {
        if (quality < 0 || quality > 5) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }
        Flashcard f = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        
        if (!f.getUserId().equals(reviewerId)) {
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

    @Transactional
    @Override
    public FlashcardResponse resetProgress(UUID flashcardId, UUID userId) {
        Flashcard f = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        if (!f.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        f.setRepetitions(0);
        f.setIntervalDays(0);
        f.setEaseFactor(2.5f);
        f.setNextReviewAt(OffsetDateTime.now());
        Flashcard saved = flashcardRepository.save(f);
        return flashcardMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public FlashcardResponse toggleSuspend(UUID flashcardId, UUID userId) {
        Flashcard f = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        if (!f.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        Boolean currentStatus = f.getIsSuspended() != null && f.getIsSuspended();
        f.setIsSuspended(!currentStatus);
        Flashcard saved = flashcardRepository.save(f);
        return flashcardMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public FlashcardResponse generateTtsAndSave(UUID flashcardId, String text, String language, String token, UUID userId) {
        Flashcard f = flashcardRepository.findById(flashcardId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_INPUT));
        if (!f.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        String textToSpeak = (text == null || text.isEmpty()) ? f.getFront() : text;
        byte[] audio = grpcClientService.callGenerateTtsAsync(token, textToSpeak, language).join();
        String fileName = "tts-" + flashcardId;
        var result = cloudinaryService.uploadBytes(audio, fileName, "tts", "auto");
        String url = (String) result.get("secure_url");
        f.setAudioUrl(url);
        Flashcard saved = flashcardRepository.save(f);
        return flashcardMapper.toResponse(saved);
    }
}