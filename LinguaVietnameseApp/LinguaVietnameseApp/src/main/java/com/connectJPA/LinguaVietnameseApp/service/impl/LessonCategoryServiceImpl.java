package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonCategoryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonCategory;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonCategoryMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonCategoryRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonCategoryServiceImpl implements LessonCategoryService {
    private final LessonCategoryRepository lessonCategoryRepository;
    private final LessonCategoryMapper lessonCategoryMapper;

    @Override
    public Page<LessonCategoryResponse> getAllLessonCategories(String lessonCategoryName, String languageCode, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<LessonCategory> categories = lessonCategoryRepository.findByLessonCategoryNameAndLanguageCodeAndIsDeletedFalse(lessonCategoryName, languageCode, pageable);
            return categories.map(lessonCategoryMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson categories: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LessonCategoryResponse getLessonCategoryById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonCategory category = lessonCategoryRepository.findByLessonCategoryIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND));
            return lessonCategoryMapper.toResponse(category);
        } catch (Exception e) {
            log.error("Error while fetching lesson category by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LessonCategoryResponse createLessonCategory(LessonCategoryRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonCategory category = lessonCategoryMapper.toEntity(request);
            category = lessonCategoryRepository.save(category);
            return lessonCategoryMapper.toResponse(category);
        } catch (Exception e) {
            log.error("Error while creating lesson category: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LessonCategoryResponse updateLessonCategory(UUID id, LessonCategoryRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonCategory category = lessonCategoryRepository.findByLessonCategoryIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND));
            lessonCategoryMapper.updateEntityFromRequest(request, category);
            category = lessonCategoryRepository.save(category);
            return lessonCategoryMapper.toResponse(category);
        } catch (Exception e) {
            log.error("Error while updating lesson category ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteLessonCategory(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonCategory category = lessonCategoryRepository.findByLessonCategoryIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_CATEGORY_NOT_FOUND));
            lessonCategoryRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting lesson category ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}