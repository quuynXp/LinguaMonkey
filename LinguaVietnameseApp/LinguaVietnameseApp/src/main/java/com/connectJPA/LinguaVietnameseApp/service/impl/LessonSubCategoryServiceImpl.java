package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSubCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSubCategoryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonSubCategory;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonSubCategoryMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonSubCategoryRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonSubCategoryService;
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
public class LessonSubCategoryServiceImpl implements LessonSubCategoryService {
    private final LessonSubCategoryRepository lessonSubCategoryRepository;
    private final LessonSubCategoryMapper lessonSubCategoryMapper;

    @Override
    @Cacheable(value = "lessonSubCategories", key = "#lessonCategoryId + ':' + #languageCode + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<LessonSubCategoryResponse> getAllLessonSubCategories(String lessonCategoryId, String languageCode, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID categoryUuid = (lessonCategoryId != null) ? UUID.fromString(lessonCategoryId) : null;
            Page<LessonSubCategory> subCategories = lessonSubCategoryRepository.findByLessonCategoryIdAndLanguageCodeAndIsDeletedFalse(categoryUuid, languageCode, pageable);
            return subCategories.map(lessonSubCategoryMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson sub-categories: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "lessonSubCategories", key = "#id")
    public LessonSubCategoryResponse getLessonSubCategoryById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonSubCategory subCategory = lessonSubCategoryRepository.findByLessonSubCategoryIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND));
            return lessonSubCategoryMapper.toResponse(subCategory);
        } catch (Exception e) {
            log.error("Error while fetching lesson sub-category by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "lessonSubCategories", key = "#result.lessonSubCategoryId")
    public LessonSubCategoryResponse createLessonSubCategory(LessonSubCategoryRequest request) {
        try {
            if (request == null || request.getLessonCategoryId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonSubCategory subCategory = lessonSubCategoryMapper.toEntity(request);
            subCategory = lessonSubCategoryRepository.save(subCategory);
            return lessonSubCategoryMapper.toResponse(subCategory);
        } catch (Exception e) {
            log.error("Error while creating lesson sub-category: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "lessonSubCategories", key = "#id")
    public LessonSubCategoryResponse updateLessonSubCategory(UUID id, LessonSubCategoryRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonSubCategory subCategory = lessonSubCategoryRepository.findByLessonSubCategoryIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND));
            lessonSubCategoryMapper.updateEntityFromRequest(request, subCategory);
            subCategory = lessonSubCategoryRepository.save(subCategory);
            return lessonSubCategoryMapper.toResponse(subCategory);
        } catch (Exception e) {
            log.error("Error while updating lesson sub-category ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "lessonSubCategories", key = "#id")
    public void deleteLessonSubCategory(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonSubCategory subCategory = lessonSubCategoryRepository.findByLessonSubCategoryIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_SUB_CATEGORY_NOT_FOUND));
            lessonSubCategoryRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting lesson sub-category ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}