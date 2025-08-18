package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonCategoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonCategoryService {
    Page<LessonCategoryResponse> getAllLessonCategories(String lessonCategoryName, String languageCode, Pageable pageable);
    LessonCategoryResponse getLessonCategoryById(UUID id);
    LessonCategoryResponse createLessonCategory(LessonCategoryRequest request);
    LessonCategoryResponse updateLessonCategory(UUID id, LessonCategoryRequest request);
    void deleteLessonCategory(UUID id);
}