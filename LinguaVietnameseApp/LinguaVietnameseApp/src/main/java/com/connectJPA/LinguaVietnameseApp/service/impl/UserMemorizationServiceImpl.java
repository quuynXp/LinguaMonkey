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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder; // Cần thiết
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

    // HÀM SEARCH THAY THẾ ELASTICSEARCH
    @Override
    public Page<UserMemorization> searchMemorizations(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
            return Page.empty();
        }
        try {
            // Lấy userId từ Security Context để lọc ghi nhớ của riêng user đó
            String currentUserIdString = SecurityContextHolder.getContext().getAuthentication().getName();
            UUID currentUserId = UUID.fromString(currentUserIdString);

            Pageable pageable = PageRequest.of(page, size);
            
            // GỌI PHƯƠNG THỨC SEARCH MỚI
            return memorizationRepository.searchMemorizationsByKeyword(currentUserId, keyword, pageable);
            
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    //@CacheEvict(value = "memorizations", key = "#request.userId")
    @Override
    public MemorizationResponse saveMemorization(MemorizationRequest request, UUID authenticatedUserId) {
        // Validate user and ownership
        if (!request.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Validate content ID if applicable
        if (request.getContentId() != null) {
            switch (request.getContentType()) {
                case EVENT:
                    if (!eventRepository.existsById(request.getContentId())) {
                        throw new AppException(ErrorCode.EVENT_NOT_FOUND);
                    }
                    break;
                case LESSON:
                    if (!lessonRepository.existsById(request.getContentId())) {
                        throw new AppException(ErrorCode.LESSON_NOT_FOUND);
                    }
                    break;
                case VIDEO:
                    if (!videoRepository.existsById(request.getContentId())) {
                        throw new AppException(ErrorCode.VIDEO_NOT_FOUND);
                    }
                    break;
                default:
                    if (request.getContentId() != null) {
                        throw new AppException(ErrorCode.INVALID_INPUT);
                    }
            }
        }

        // Build and save memorization
        UserMemorization memorization = UserMemorization.builder()
                .userId(request.getUserId())
                .contentType(request.getContentType())
                .contentId(request.getContentId())
                .noteText(request.getNoteText())
                .isFavorite(request.isFavorite())
                .build();

        memorization = memorizationRepository.save(memorization);
        return mapToResponse(memorization);
    }

    @Transactional
    //@CacheEvict(value = "memorizations", key = "#request.userId")
    @Override
    public MemorizationResponse updateMemorization(UUID memorizationId, MemorizationRequest request, UUID authenticatedUserId) {
        UserMemorization memorization = memorizationRepository.findById(memorizationId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMORIZATION_NOT_FOUND));

        // Validate ownership
        if (!memorization.getUserId().equals(authenticatedUserId) || !request.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Validate content ID if applicable
        if (request.getContentId() != null) {
            switch (request.getContentType()) {
                case EVENT:
                    if (!eventRepository.existsById(request.getContentId())) {
                        throw new AppException(ErrorCode.EVENT_NOT_FOUND);
                    }
                    break;
                case LESSON:
                    if (!lessonRepository.existsById(request.getContentId())) {
                        throw new AppException(ErrorCode.LESSON_NOT_FOUND);
                    }
                    break;
                case VIDEO:
                    if (!videoRepository.existsById(request.getContentId())) {
                        throw new AppException(ErrorCode.VIDEO_NOT_FOUND);
                    }
                    break;
                default:
                    if (request.getContentId() != null) {
                        throw new AppException(ErrorCode.INVALID_INPUT);
                    }
            }
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
    //@CacheEvict(value = "memorizations", key = "#authenticatedUserId")
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

    //@Cacheable(value = "memorizations", key = "#userId + '-' + #contentType + '-' + #pageable.pageNumber")
    @Override
    public Page<MemorizationResponse> getMemorizationsByUser(UUID userId, String contentType, Pageable pageable) {
        Page<UserMemorization> memorizations;
        if (contentType != null && !contentType.isEmpty()) {
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