package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.SwitchVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionEnrollmentResponse;
import org.springframework.cache.annotation.CachePut;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface CourseVersionEnrollmentService {
    Page<CourseVersionEnrollmentResponse> getAllCourseVersionEnrollments(UUID courseId, UUID userId, Pageable pageable);

    @Transactional
    //@CachePut(value = "CourseVersionEnrollment", key = "#result.courseId + ':' + #result.userId")
    CourseVersionEnrollmentResponse switchCourseVersion(SwitchVersionRequest request);

    CourseVersionEnrollmentResponse getCourseVersionEnrollmentByIds(UUID courseId, UUID userId);
    CourseVersionEnrollmentResponse createCourseVersionEnrollment(CourseVersionEnrollmentRequest request);
    CourseVersionEnrollmentResponse updateCourseVersionEnrollment(UUID courseId, UUID userId, CourseVersionEnrollmentRequest request);
    void deleteCourseVersionEnrollment(UUID courseId, UUID userId);
    void deleteCourseVersionEnrollmentsByCourseId(UUID courseId);
}