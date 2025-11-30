package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.MemorizationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemorizationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.EventRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserMemorizationRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoRepository;
import com.connectJPA.LinguaVietnameseApp.service.UserMemorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserMemorizationServiceImpl implements UserMemorizationService {
    private final UserMemorizationRepository memorizationRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;

    @Override
    public Page<MemorizationResponse> searchMemorizations(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
            // Fallback to get all if no keyword, but usually this returns empty or specific logic
             return Page.empty();
        }
        try {
            String currentUserIdString = SecurityContextHolder.getContext().getAuthentication().getName();
            UUID currentUserId = UUID.fromString(currentUserIdString);

            Pageable pageable = PageRequest.of(page, size);
            Page<UserMemorization> result = memorizationRepository.searchMemorizationsByKeyword(currentUserId, keyword, pageable);
            return result.map(this::mapToResponse);

        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    @Override
    public MemorizationResponse saveMemorization(MemorizationRequest request, UUID authenticatedUserId) {
        if (!request.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getContentId() != null) {
            switch (request.getContentType()) {
                case EVENT:
                    if (!eventRepository.existsById(request.getContentId())) throw new AppException(ErrorCode.EVENT_NOT_FOUND);
                    break;
                case LESSON:
                    if (!lessonRepository.existsById(request.getContentId())) throw new AppException(ErrorCode.LESSON_NOT_FOUND);
                    break;
                case VIDEO:
                    if (!videoRepository.existsById(request.getContentId())) throw new AppException(ErrorCode.VIDEO_NOT_FOUND);
                    break;
                default:
                    // For NOTE, VOCABULARY, FORMULA contentId might be null or handled differently
                    break;
            }
        }

        UserMemorization memorization = UserMemorization.builder()
                .userId(request.getUserId())
                .contentType(request.getContentType())
                .contentId(request.getContentId())
                .noteText(request.getNoteText())
                .isFavorite(request.isFavorite())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();

        memorization = memorizationRepository.save(memorization);
        return mapToResponse(memorization);
    }

    @Transactional
    @Override
    public MemorizationResponse updateMemorization(UUID memorizationId, MemorizationRequest request, UUID authenticatedUserId) {
        UserMemorization memorization = memorizationRepository.findById(memorizationId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMORIZATION_NOT_FOUND));

        if (!memorization.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        memorization.setContentType(request.getContentType());
        memorization.setContentId(request.getContentId());
        memorization.setNoteText(request.getNoteText());
        memorization.setFavorite(request.isFavorite());
        memorization.setUpdatedAt(OffsetDateTime.now());

        memorization = memorizationRepository.save(memorization);
        return mapToResponse(memorization);
    }

    @Transactional
    @Override
    public void deleteMemorization(UUID memorizationId, UUID authenticatedUserId) {
        UserMemorization memorization = memorizationRepository.findById(memorizationId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMORIZATION_NOT_FOUND));

        if (!memorization.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        memorization.setDeleted(true);
        memorization.setDeletedAt(OffsetDateTime.now());
        memorizationRepository.save(memorization);
    }

    @Override
    public Page<MemorizationResponse> getMemorizationsByUser(UUID userId, String contentType, Pageable pageable) {
        Page<UserMemorization> memorizations;
        if (contentType != null && !contentType.isEmpty() && !contentType.equals("all")) {
            try {
                ContentType type = ContentType.valueOf(contentType);
                memorizations = memorizationRepository.findByUserIdAndContentTypeAndIsDeletedFalse(userId, type, pageable);
            } catch (IllegalArgumentException e) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
        } else {
            memorizations = memorizationRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
        }
        return memorizations.map(this::mapToResponse);
    }

    private MemorizationResponse mapToResponse(UserMemorization memorization) {
        return MemorizationResponse.builder()
                .memorizationId(memorization.getMemorizationId())
                .userId(memorization.getUserId())
                .contentType(memorization.getContentType())
                .contentId(memorization.getContentId())
                .noteText(memorization.getNoteText())
                .isFavorite(memorization.isFavorite())
                .createdAt(memorization.getCreatedAt())
                .updatedAt(memorization.getUpdatedAt())
                .build();
    }
}