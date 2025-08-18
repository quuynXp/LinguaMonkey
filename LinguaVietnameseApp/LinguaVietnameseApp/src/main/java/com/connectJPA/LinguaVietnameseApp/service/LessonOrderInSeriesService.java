package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonOrderInSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonOrderInSeriesResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonOrderInSeriesService {
    Page<LessonOrderInSeriesResponse> getAllLessonOrdersInSeries(String lessonId, String lessonSeriesId, Pageable pageable);
    LessonOrderInSeriesResponse getLessonOrderInSeriesByIds(UUID lessonId, UUID lessonSeriesId);
    LessonOrderInSeriesResponse createLessonOrderInSeries(LessonOrderInSeriesRequest request);
    LessonOrderInSeriesResponse updateLessonOrderInSeries(UUID lessonId, UUID lessonSeriesId, LessonOrderInSeriesRequest request);
    void deleteLessonOrderInSeries(UUID lessonId, UUID lessonSeriesId);
}