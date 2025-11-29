package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PronunciationPracticeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;
import java.util.concurrent.ExecutionException;

public interface BasicLessonService {
    BasicLessonResponse create(BasicLessonRequest request);
    BasicLessonResponse getById(UUID id);
    Page<BasicLessonResponse> getByLanguageAndType(String languageCode, String lessonType, Pageable pageable);
    BasicLessonResponse enrichLesson(UUID id);
    PronunciationResponseBody checkPronunciation(PronunciationPracticeRequest request)
            throws ExecutionException, InterruptedException;
}
