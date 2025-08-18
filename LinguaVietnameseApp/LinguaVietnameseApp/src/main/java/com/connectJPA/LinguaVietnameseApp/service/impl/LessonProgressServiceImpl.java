package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonProgressMapper;
import com.connectJPA.LinguaVietnameseApp.repository.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProgressServiceImpl implements LessonProgressService {
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonProgressMapper lessonProgressMapper;

    @Override
    @Cacheable(value = "lessonProgress", key = "#lessonId + ':' + #userId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<LessonProgressResponse> getAllLessonProgress(String lessonId, String userId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID lessonUuid = (lessonId != null) ? UUID.fromString(lessonId) : null;
            UUID userUuid = (userId != null) ? UUID.fromString(userId) : null;
            Page<LessonProgress> progress = lessonProgressRepository.findByLessonIdAndUserIdAndIsDeletedFalse(lessonUuid, userUuid, pageable);
            return progress.map(lessonProgressMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson progress: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "lessonProgress", key = "#lessonId + ':' + #userId")
    public LessonProgressResponse getLessonProgressByIds(UUID lessonId, UUID userId) {
        try {
            if (lessonId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonProgress progress = lessonProgressRepository.findByLessonIdAndUserIdAndIsDeletedFalse(lessonId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_NOT_FOUND));
            return lessonProgressMapper.toResponse(progress);
        } catch (Exception e) {
            log.error("Error while fetching lesson progress by IDs {} and {}: {}", lessonId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "lessonProgress", key = "#result.lessonId + ':' + #result.userId")
    public LessonProgressResponse createLessonProgress(LessonProgressRequest request) {
        try {
            if (request == null || request.getLessonId() == null || request.getUserId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonProgress progress = lessonProgressMapper.toEntity(request);
            progress = lessonProgressRepository.save(progress);
            return lessonProgressMapper.toResponse(progress);
        } catch (Exception e) {
            log.error("Error while creating lesson progress: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "lessonProgress", key = "#lessonId + ':' + #userId")
    public LessonProgressResponse updateLessonProgress(UUID lessonId, UUID userId, LessonProgressRequest request) {
        try {
            if (lessonId == null || userId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonProgress progress = lessonProgressRepository.findByLessonIdAndUserIdAndIsDeletedFalse(lessonId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_NOT_FOUND));
            lessonProgressMapper.updateEntityFromRequest(request, progress);
            progress = lessonProgressRepository.save(progress);
            return lessonProgressMapper.toResponse(progress);
        } catch (Exception e) {
            log.error("Error while updating lesson progress for {} and {}: {}", lessonId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "lessonProgress", key = "#lessonId + ':' + #userId")
    public void deleteLessonProgress(UUID lessonId, UUID userId) {
        try {
            if (lessonId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonProgress progress = lessonProgressRepository.findByLessonIdAndUserIdAndIsDeletedFalse(lessonId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_NOT_FOUND));
            lessonProgressRepository.softDeleteByLessonIdAndUserId(lessonId, userId);
        } catch (Exception e) {
            log.error("Error while deleting lesson progress for {} and {}: {}", lessonId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}