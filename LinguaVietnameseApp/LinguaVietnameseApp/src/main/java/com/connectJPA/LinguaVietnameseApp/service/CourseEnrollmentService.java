package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEnrollmentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CourseEnrollmentService {
    Page<CourseEnrollmentResponse> getAllCourseEnrollments(UUID courseId, UUID userId, Pageable pageable);
    CourseEnrollmentResponse getCourseEnrollmentByIds(UUID courseId, UUID userId);
    CourseEnrollmentResponse createCourseEnrollment(CourseEnrollmentRequest request);
    CourseEnrollmentResponse updateCourseEnrollment(UUID courseId, UUID userId, CourseEnrollmentRequest request);
    void deleteCourseEnrollment(UUID courseId, UUID userId);
    void deleteCourseEnrollmentsByCourseId(UUID courseId);
}