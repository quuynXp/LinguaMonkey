package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BasicLessonService {
    BasicLessonResponse create(BasicLessonRequest request);
    BasicLessonResponse getById(UUID id);
    Page<BasicLessonResponse> getByLanguageAndType(String languageCode, String lessonType, Pageable pageable);
}
