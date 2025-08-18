package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseLessonResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CourseLessonService {
    Page<CourseLessonResponse> getAllCourseLessons(UUID courseId, UUID lessonId, Pageable pageable);
    CourseLessonResponse getCourseLessonByIds(UUID courseId, UUID lessonId);
    CourseLessonResponse createCourseLesson(CourseLessonRequest request);
    CourseLessonResponse updateCourseLesson(UUID courseId, UUID lessonId, CourseLessonRequest request);
    void deleteCourseLesson(UUID courseId, UUID lessonId);
}