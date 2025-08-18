package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonQuestionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonQuestionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonQuestionService {
    Page<LessonQuestionResponse> getAllLessonQuestions(String lessonId, String languageCode, Pageable pageable);
    LessonQuestionResponse getLessonQuestionById(UUID id);
    LessonQuestionResponse createLessonQuestion(LessonQuestionRequest request);
    LessonQuestionResponse updateLessonQuestion(UUID id, LessonQuestionRequest request);
    void deleteLessonQuestion(UUID id);
}