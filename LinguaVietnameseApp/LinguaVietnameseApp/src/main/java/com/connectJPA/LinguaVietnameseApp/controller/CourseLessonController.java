package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseLessonResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseLessonService;
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
@RequestMapping("/api/v1/course-lessons")
@RequiredArgsConstructor
public class CourseLessonController {
    private final CourseLessonService courseLessonService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course lessons", description = "Retrieve a paginated list of course lessons with optional filtering by courseId or lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseLessonResponse>> getAllCourseLessons(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) UUID lessonId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseLessonResponse> courseLessons = courseLessonService.getAllCourseLessons(courseId, lessonId, pageable);
        return AppApiResponse.<Page<CourseLessonResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.list.success", null, locale))
                .result(courseLessons)
                .build();
    }

    @Operation(summary = "Get course lesson by IDs", description = "Retrieve a course lesson by courseId and lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course lesson"),
            @ApiResponse(responseCode = "404", description = "Course lesson not found")
    })
    @GetMapping("/{courseId}/{lessonId}")
    public AppApiResponse<CourseLessonResponse> getCourseLessonByIds(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            Locale locale) {
        CourseLessonResponse courseLesson = courseLessonService.getCourseLessonByIds(courseId, lessonId);
        return AppApiResponse.<CourseLessonResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.get.success", null, locale))
                .result(courseLesson)
                .build();
    }

    @Operation(summary = "Create a new course lesson", description = "Create a new course lesson with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Course lesson created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid course lesson data")
    })
    @PostMapping
    public AppApiResponse<CourseLessonResponse> createCourseLesson(
            @Valid @RequestBody CourseLessonRequest request,
            Locale locale) {
        CourseLessonResponse courseLesson = courseLessonService.createCourseLesson(request);
        return AppApiResponse.<CourseLessonResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseLesson.created.success", null, locale))
                .result(courseLesson)
                .build();
    }

    @Operation(summary = "Update a course lesson", description = "Update an existing course lesson by courseId and lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course lesson updated successfully"),
            @ApiResponse(responseCode = "404", description = "Course lesson not found"),
            @ApiResponse(responseCode = "400", description = "Invalid course lesson data")
    })
    @PutMapping("/{courseId}/{lessonId}")
    public AppApiResponse<CourseLessonResponse> updateCourseLesson(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Valid @RequestBody CourseLessonRequest request,
            Locale locale) {
        CourseLessonResponse courseLesson = courseLessonService.updateCourseLesson(courseId, lessonId, request);
        return AppApiResponse.<CourseLessonResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.updated.success", null, locale))
                .result(courseLesson)
                .build();
    }

    @Operation(summary = "Delete a course lesson", description = "Soft delete a course lesson by courseId and lessonId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course lesson deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Course lesson not found")
    })
    @DeleteMapping("/{courseId}/{lessonId}")
    public AppApiResponse<Void> deleteCourseLesson(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            Locale locale) {
        courseLessonService.deleteCourseLesson(courseId, lessonId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseLesson.deleted.success", null, locale))
                .build();
    }
}