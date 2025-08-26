
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all courses", description = "Retrieve a paginated list of courses with optional filtering by title or languageCode")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved courses"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseResponse>> getAllCourses(
            @Parameter(description = "Title filter") @RequestParam(required = false) String title,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseResponse> courses = courseService.getAllCourses(title, languageCode, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.list.success", null, locale))
                .result(courses)
                .build();
    }

    @Operation(summary = "Get enrolled courses of a user", description = "Retrieve courses a user has enrolled in")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved enrolled courses"),
            @ApiResponse(responseCode = "404", description = "User not found or no courses enrolled")
    })
    @GetMapping("/enrolled/{userId}")
    public AppApiResponse<Page<CourseResponse>> getEnrolledCoursesByUserId(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseResponse> courses = courseService.getEnrolledCoursesByUserId(userId, pageable);
        return AppApiResponse.<Page<CourseResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("course.enrolled.byUser.success", null, locale))
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
}
