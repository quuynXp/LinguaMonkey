package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.SwitchVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseEnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/course-enrollments")
@RequiredArgsConstructor
public class CourseEnrollmentController {
    private final CourseEnrollmentService courseEnrollmentService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course enrollments", description = "Retrieve a paginated list of course enrollments with optional filtering by courseId or userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course enrollments"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseEnrollmentResponse>> getAllCourseEnrollments(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseEnrollmentResponse> enrollments = courseEnrollmentService.getAllCourseEnrollments(courseId, userId, pageable);
        return AppApiResponse.<Page<CourseEnrollmentResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseEnrollment.list.success", null, locale))
                .result(enrollments)
                .build();
    }

    @Operation(summary = "Get course enrollment by IDs", description = "Retrieve a course enrollment by courseId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course enrollment"),
            @ApiResponse(responseCode = "404", description = "Course enrollment not found")
    })
    @GetMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseEnrollmentResponse> getCourseEnrollmentByIds(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        CourseEnrollmentResponse enrollment = courseEnrollmentService.getCourseEnrollmentByIds(courseId, userId);
        return AppApiResponse.<CourseEnrollmentResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseEnrollment.get.success", null, locale))
                .result(enrollment)
                .build();
    }

    @Operation(summary = "Create a new course enrollment", description = "Create a new course enrollment with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Course enrollment created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid course enrollment data")
    })
    @PostMapping
    public AppApiResponse<CourseEnrollmentResponse> createCourseEnrollment(
            @Valid @RequestBody CourseEnrollmentRequest request,
            Locale locale) {
        CourseEnrollmentResponse enrollment = courseEnrollmentService.createCourseEnrollment(request);
        return AppApiResponse.<CourseEnrollmentResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseEnrollment.created.success", null, locale))
                .result(enrollment)
                .build();
    }

    @Operation(summary = "Learner chọn học version khác", description = "Cập nhật enrollment để trỏ đến version đã chọn (đè lên bản cũ)")
    @PutMapping("/switch-version")
    public AppApiResponse<CourseEnrollmentResponse> switchCourseVersion(
            @Valid @RequestBody SwitchVersionRequest request, // Request chứa enrollmentId và newVersionId
            Locale locale) {
        CourseEnrollmentResponse enrollment = courseEnrollmentService.switchCourseVersion(request);
        return AppApiResponse.<CourseEnrollmentResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseEnrollment.created.success", null, locale))
                .result(enrollment)
                .build();
    }

    @Operation(summary = "Update a course enrollment", description = "Update an existing course enrollment by courseId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course enrollment updated successfully"),
            @ApiResponse(responseCode = "404", description = "Course enrollment not found"),
            @ApiResponse(responseCode = "400", description = "Invalid course enrollment data")
    })
    @PutMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseEnrollmentResponse> updateCourseEnrollment(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Valid @RequestBody CourseEnrollmentRequest request,
            Locale locale) {
        CourseEnrollmentResponse enrollment = courseEnrollmentService.updateCourseEnrollment(courseId, userId, request);
        return AppApiResponse.<CourseEnrollmentResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseEnrollment.updated.success", null, locale))
                .result(enrollment)
                .build();
    }

    @Operation(summary = "Delete a course enrollment", description = "Soft delete a course enrollment by courseId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course enrollment deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Course enrollment not found")
    })
//    @PreAuthorize("hasAuthority('COURSE_ENROLLMENT_DELETE')")
    @DeleteMapping("/{courseId}/{userId}")
    public AppApiResponse<Void> deleteCourseEnrollment(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        courseEnrollmentService.deleteCourseEnrollment(courseId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseEnrollment.deleted.success", null, locale))
                .build();
    }
}