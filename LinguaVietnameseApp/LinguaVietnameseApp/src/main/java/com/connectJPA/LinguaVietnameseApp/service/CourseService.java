package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CourseService {
    Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Pageable pageable);

    List<CourseResponse> getRecommendedCourses(UUID userId, int limit);
    CourseResponse approveCourse(UUID id);
    CourseResponse rejectCourse(UUID id, String reason);
    Page<CourseResponse> getDiscountedCourses(Pageable pageable);    CourseResponse getCourseById(UUID id);
    CourseResponse createCourse(CourseRequest request);
    CourseResponse updateCourse(UUID id, CourseRequest request);
    void deleteCourse(UUID id);
    List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit);

    @Cacheable(value = "enrolledCoursesByUser", key = "#userId + ':' + #pageable")
    Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable);

    @Cacheable(value = "coursesByCreator", key = "#creatorId + ':' + #pageable")
    Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable);
}