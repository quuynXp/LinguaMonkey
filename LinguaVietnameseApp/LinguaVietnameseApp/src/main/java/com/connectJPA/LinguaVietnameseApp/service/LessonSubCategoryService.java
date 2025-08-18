package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSubCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSubCategoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonSubCategoryService {
    Page<LessonSubCategoryResponse> getAllLessonSubCategories(String lessonCategoryId, String languageCode, Pageable pageable);
    LessonSubCategoryResponse getLessonSubCategoryById(UUID id);
    LessonSubCategoryResponse createLessonSubCategory(LessonSubCategoryRequest request);
    LessonSubCategoryResponse updateLessonSubCategory(UUID id, LessonSubCategoryRequest request);
    void deleteLessonSubCategory(UUID id);
}