package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateCourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PublishVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseDetailsRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface CourseService {

    // === QUẢN LÝ VERSIONING MỚI ===
    CourseResponse createCourse(CreateCourseRequest request);
    CourseVersionResponse updateCourseVersion(UUID versionId, UpdateCourseVersionRequest request);
    CourseVersionResponse publishCourseVersion(UUID versionId, PublishVersionRequest request);
    CourseVersionResponse createNewDraftVersion(UUID courseId);
    CourseResponse updateCourseDetails(UUID id, UpdateCourseDetailsRequest request);

    // === LOGIC CŨ (ĐÃ ĐIỀU CHỈNH) ===
    Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Pageable pageable);
    List<CourseResponse> getRecommendedCourses(UUID userId, int limit);
    List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit);
    // Page<CourseResponse> getDiscountedCourses(Pageable pageable);
    CourseResponse getCourseById(UUID id);
    void deleteCourse(UUID id);
    Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable);
    Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable);

    // === LOGIC ADMIN (ĐIỀU CHỈNH) ===
    CourseVersionResponse approveCourseVersion(UUID versionId);
    CourseVersionResponse rejectCourseVersion(UUID versionId, String reason);

    List<String> getCourseCategories();
    // THÊM: Phương thức tìm kiếm
    Page<Course> searchCourses(String keyword, int page, int size, Map<String, Object> filters);
}