package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressWrongItemRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressWrongItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonProgressWrongItemService {
    Page<LessonProgressWrongItemResponse> getAllLessonProgressWrongItems(UUID lessonId, UUID userId, UUID lessonQuestionId, Pageable pageable);
    LessonProgressWrongItemResponse getLessonProgressWrongItemByIds(UUID lessonId, UUID userId, UUID lessonQuestionId);
    LessonProgressWrongItemResponse createLessonProgressWrongItem(LessonProgressWrongItemRequest request);
    LessonProgressWrongItemResponse updateLessonProgressWrongItem(UUID lessonId, UUID userId, UUID lessonQuestionId, LessonProgressWrongItemRequest request);
    void deleteLessonProgressWrongItem(UUID lessonId, UUID userId, UUID lessonQuestionId);
}