package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CourseService {
    Page<CourseResponse> getAllCourses(String title, String languageCode, Pageable pageable);
    CourseResponse getCourseById(UUID id);
    CourseResponse createCourse(CourseRequest request);
    CourseResponse updateCourse(UUID id, CourseRequest request);
    void deleteCourse(UUID id);
    Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable);

}