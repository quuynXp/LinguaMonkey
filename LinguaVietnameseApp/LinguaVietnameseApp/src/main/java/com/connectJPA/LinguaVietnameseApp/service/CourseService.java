package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateCourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PublishVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseDetailsRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CourseService {

    // === QUẢN LÝ VERSIONING MỚI ===

    /**
     * Tạo một Course mới và CourseVersion DRAFT đầu tiên.
     */
    CourseResponse createCourse(CreateCourseRequest request);

    /**
     * (Lưu tạm) Cập nhật nội dung cho một CourseVersion DRAFT.
     */
    CourseVersionResponse updateCourseVersion(UUID versionId, UpdateCourseVersionRequest request);

    /**
     * (Publish) Gửi yêu cầu public một CourseVersion DRAFT.
     */
    CourseVersionResponse publishCourseVersion(UUID versionId, PublishVersionRequest request);

    /**
     * (Clone) Tạo một CourseVersion DRAFT mới từ phiên bản public hiện tại.
     */
    CourseVersionResponse createNewDraftVersion(UUID courseId);

    /**
     * Cập nhật thông tin chung (Title, Price) của Course (không phải nội dung).
     */
    CourseResponse updateCourseDetails(UUID id, UpdateCourseDetailsRequest request);


    // === LOGIC CŨ (ĐÃ ĐIỀU CHỈNH) ===

    Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Pageable pageable);

    List<CourseResponse> getRecommendedCourses(UUID userId, int limit);

    List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit);

    Page<CourseResponse> getDiscountedCourses(Pageable pageable);

    CourseResponse getCourseById(UUID id);

    void deleteCourse(UUID id);

    Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable);

    Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable);


    // === LOGIC ADMIN (ĐIỀU CHỈNH) ===
    // Các hàm này giờ nên thao tác trên CourseVersion

    /**
     * Admin duyệt một CourseVersion đang PENDING_APPROVAL.
     */
    CourseVersionResponse approveCourseVersion(UUID versionId);

    /**
     * Admin từ chối một CourseVersion đang PENDING_APPROVAL.
     */
    CourseVersionResponse rejectCourseVersion(UUID versionId, String reason);

    // XÓA 2 HÀM CŨ NÀY (hoặc giữ lại nếu bạn vẫn muốn duyệt Course, nhưng flow PENDING giờ là ở Version)
    // CourseResponse approveCourse(UUID id);
    // CourseResponse rejectCourse(UUID id, String reason);
}