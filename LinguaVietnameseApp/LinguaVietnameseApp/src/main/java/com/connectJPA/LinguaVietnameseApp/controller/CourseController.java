
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
// import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.CourseSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;
    private final MessageSource messageSource;

    // === LEARNER API (API CHO NGƯỜI HỌC) ===

    @Operation(summary = "Get all public courses (paginated)", description = "Lấy danh sách khóa học public cho learner")
    @GetMapping
    public AppApiResponse<Page<CourseResponse>> getAllCourses(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) CourseType type,
            Pageable pageable,
            Locale locale) {

        Page<CourseResponse> courses = courseService.getAllCourses(title, languageCode, type, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(courses)
                .build();
    }


        @Operation(summary = "Get all course categories", description = "Lấy danh sách các category (Enum/String)")
        @GetMapping("/categories") // PHẢI ĐẶT TRƯỚC @GetMapping("/{id}")
        public AppApiResponse<List<String>> getCourseCategories(Locale locale) {
                List<String> categories = courseService.getCourseCategories(); // Giả định service này tồn tại
                return AppApiResponse.<List<String>>builder()
                        .code(200)
                        .message(messageSource.getMessage("course.categories.success", null, locale))
                        .result(categories)
                        .build();
        }

    @Operation(summary = "Get course by ID", description = "Lấy chi tiết khóa học (và version public mới nhất)")
    @GetMapping("/{id}")
    public AppApiResponse<CourseResponse> getCourseById(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            Locale locale) {
        CourseResponse course = courseService.getCourseById(id);
        return AppApiResponse.<CourseResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.get.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "Get all course difficulty levels", description = "Lấy danh sách các mức độ (Enum)")
    @GetMapping("/levels")
    public AppApiResponse<List<String>> getCourseLevels(Locale locale) {
        List<String> levels = Arrays.stream(DifficultyLevel.values())
                .map(DifficultyLevel::name)
                .collect(Collectors.toList());
        return AppApiResponse.<List<String>>builder()
                .code(200)
                .message(messageSource.getMessage("course.levels.success", null, locale))
                .result(levels)
                .build();
    }

    @Operation(summary = "Get recommended courses", description = "Lấy các khóa học gợi ý cho user")
    @GetMapping("/recommended")
    public AppApiResponse<List<CourseResponse>> getRecommendedCourses(
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(required = true) UUID userId,
            Locale locale) {
        List<CourseResponse> courses = courseService.getRecommendedCourses(userId, limit);
        return AppApiResponse.<List<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.recommended.success", null, locale))
                .result(courses)
                .build();
    }

    @Operation(summary = "Get courses by creator ID", description = "Lấy các khóa học (public) của một creator")
    @GetMapping("/creator/{creatorId}")
    public AppApiResponse<Page<CourseResponse>> getCoursesByCreator(
            @PathVariable UUID creatorId,
            Pageable pageable,
            Locale locale) {
        // Hàm này sẽ được dùng cho cả 'My P2P Courses' và xem profile creator
        Page<CourseResponse> courses = courseService.getCoursesByCreator(creatorId, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.by.creator.success", null, locale))
                .result(courses)
                .build();
    }

    // === CREATOR P2P API (API CHO NGƯỜI TẠO) ===

    @Operation(summary = "[Creator] Create a new course (draft)", description = "Tạo một course mới và version DRAFT đầu tiên")
    @PostMapping
    public AppApiResponse<CourseResponse> createCourse(
            @Valid @RequestBody CreateCourseRequest request,
            Locale locale) {
        CourseResponse course = courseService.createCourse(request);
        return AppApiResponse.<CourseResponse>builder()
                .code(201)
                .message(messageSource.getMessage("course.created.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "[Creator] Update course details (title, price)", description = "Cập nhật thông tin chung của khóa học (không phải nội dung)")
    @PutMapping("/{id}/details")
    public AppApiResponse<CourseResponse> updateCourseDetails(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            @Valid @RequestBody UpdateCourseDetailsRequest request,
            Locale locale) {
        CourseResponse course = courseService.updateCourseDetails(id, request);
        return AppApiResponse.<CourseResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.updated.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "[Creator] Create new draft version", description = "Tạo bản nháp mới (v2, v3...) từ bản public hiện tại")
    @PostMapping("/{courseId}/versions")
    public AppApiResponse<CourseVersionResponse> createNewVersion(
            @PathVariable UUID courseId,
            Locale locale) {
        CourseVersionResponse newDraft = courseService.createNewDraftVersion(courseId);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(201)
                .message(messageSource.getMessage("course.version.created.success", null, locale))
                .result(newDraft)
                .build();
    }

    @Operation(summary = "[Creator] Update draft version (Save Draft)", description = "Lưu tạm (cập nhật) nội dung của một bản DRAFT")
    @PutMapping("/versions/{versionId}")
    public AppApiResponse<CourseVersionResponse> updateCourseVersion(
            @PathVariable UUID versionId,
            @Valid @RequestBody UpdateCourseVersionRequest request,
            Locale locale) {
        CourseVersionResponse version = courseService.updateCourseVersion(versionId, request);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.version.updated.success", null, locale))
                .result(version)
                .build();
    }

    @Operation(summary = "[Creator] Publish a draft version", description = "Yêu cầu public một bản DRAFT (cần lý do)")
    @PostMapping("/versions/{versionId}/publish")
    public AppApiResponse<CourseVersionResponse> publishCourseVersion(
            @PathVariable UUID versionId,
            @Valid @RequestBody PublishVersionRequest request,
            Locale locale) {
        CourseVersionResponse version = courseService.publishCourseVersion(versionId, request);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.version.published.success", null, locale))
                .result(version)
                .build();
    }

    @Operation(summary = "[Creator] Delete a course", description = "Xóa mềm một khóa học (chỉ creator hoặc admin)")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            Locale locale) {
        // TODO: Thêm @PreAuthorize("hasRole('ADMIN') or @courseSecurity.isCreator(#id, principal)")
        courseService.deleteCourse(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("course.deleted.success", null, locale))
                .build();
    }

    // === ADMIN API ===

    @Operation(summary = "[Admin] Approve a course version", description = "Admin duyệt một version đang PENDING_APPROVAL")
    @PostMapping("/versions/{versionId}/approve")
    // @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<CourseVersionResponse> approveCourseVersion(
            @PathVariable UUID versionId, Locale locale) {
        CourseVersionResponse version = courseService.approveCourseVersion(versionId);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message("Course version approved")
                .result(version)
                .build();
    }

    @Operation(summary = "[Admin] Reject a course version", description = "Admin từ chối một version đang PENDING_APPROVAL")
    @PostMapping("/versions/{versionId}/reject")
    // @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<CourseVersionResponse> rejectCourseVersion(
            @PathVariable UUID versionId, @RequestParam String reason, Locale locale) {
        CourseVersionResponse version = courseService.rejectCourseVersion(versionId, reason);
        return AppApiResponse.<CourseVersionResponse>builder()
                .code(200)
                .message("Course version rejected")
                .result(version)
                .build();
    }
}
