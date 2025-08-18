package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonProgressService {
    Page<LessonProgressResponse> getAllLessonProgress(String lessonId, String userId, Pageable pageable);
    LessonProgressResponse getLessonProgressByIds(UUID lessonId, UUID userId);
    LessonProgressResponse createLessonProgress(LessonProgressRequest request);
    LessonProgressResponse updateLessonProgress(UUID lessonId, UUID userId, LessonProgressRequest request);
    void deleteLessonProgress(UUID lessonId, UUID userId);
}