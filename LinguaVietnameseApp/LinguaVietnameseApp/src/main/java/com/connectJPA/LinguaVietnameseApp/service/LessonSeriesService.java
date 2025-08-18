package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSeriesResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonSeriesService {
    Page<LessonSeriesResponse> getAllLessonSeries(String lessonSeriesName, String languageCode, Pageable pageable);
    LessonSeriesResponse getLessonSeriesById(UUID id);
    LessonSeriesResponse createLessonSeries(LessonSeriesRequest request);
    LessonSeriesResponse updateLessonSeries(UUID id, LessonSeriesRequest request);
    void deleteLessonSeries(UUID id);
}