
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
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

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;
    private final MessageSource messageSource;
    private final UserService userService;

    @GetMapping
    public AppApiResponse<Page<CourseResponse>> getAllCourses(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) CourseType type, // FREE, PURCHASED
            Pageable pageable,
            Locale locale) {

        Page<CourseResponse> courses = courseService.getAllCourses(title, languageCode, type, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(courses)
                .build();
    }

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



    @Operation(summary = "Get course by ID", description = "Retrieve a course by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course"),
            @ApiResponse(responseCode = "404", description = "Course not found")
    })
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

    @Operation(summary = "Create a new course", description = "Create a new course with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Course created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid course data")
    })
    @PostMapping
    public AppApiResponse<CourseResponse> createCourse(
            @Valid @RequestBody CourseRequest request,
            Locale locale) {
        CourseResponse course = courseService.createCourse(request);
        return AppApiResponse.<CourseResponse>builder()
                .code(201)
                .message(messageSource.getMessage("course.created.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "Update a course", description = "Update an existing course by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course updated successfully"),
            @ApiResponse(responseCode = "404", description = "Course not found"),
            @ApiResponse(responseCode = "400", description = "Invalid course data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<CourseResponse> updateCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            @Valid @RequestBody CourseRequest request,
            Locale locale) {
        CourseResponse course = courseService.updateCourse(id, request);
        return AppApiResponse.<CourseResponse>builder()
                .code(200)
                .message(messageSource.getMessage("course.updated.success", null, locale))
                .result(course)
                .build();
    }

    @Operation(summary = "Delete a course", description = "Soft delete a course by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Course not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            Locale locale) {
        courseService.deleteCourse(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("course.deleted.success", null, locale))
                .build();
    }


    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<CourseResponse> approveCourse(@PathVariable UUID id, Locale locale) {
        CourseResponse res = courseService.approveCourse(id);
        return AppApiResponse.<CourseResponse>builder().code(200).message("Course approved").result(res).build();
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<CourseResponse> rejectCourse(@PathVariable UUID id, @RequestParam(required=false) String reason, Locale locale) {
        CourseResponse res = courseService.rejectCourse(id, reason);
        return AppApiResponse.<CourseResponse>builder().code(200).message("Course rejected").result(res).build();
    }

    @GetMapping("/creator/{creatorId}")
    public AppApiResponse<Page<CourseResponse>> getCoursesByCreator(
            @PathVariable UUID creatorId,
            Pageable pageable,
            Locale locale) {
        Page<CourseResponse> courses = courseService.getCoursesByCreator(creatorId, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.by.creator.success", null, locale))
                .result(courses)
                .build();
    }
}
