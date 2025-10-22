package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseReviewService;
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

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/course-reviews")
@RequiredArgsConstructor
public class CourseReviewController {
    private final CourseReviewService courseReviewService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course reviews", description = "Retrieve a paginated list of course reviews with optional filtering by courseId, userId, or rating")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course reviews"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseReviewResponse>> getAllCourseReviews(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Rating filter") @RequestParam(required = false) BigDecimal rating,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseReviewResponse> reviews = courseReviewService.getAllCourseReviews(courseId, userId, rating, pageable);
        return AppApiResponse.<Page<CourseReviewResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.list.success", null, locale))
                .result(reviews)
                .build();
    }

    @Operation(summary = "Get course review by IDs", description = "Retrieve a course review by courseId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course review"),
            @ApiResponse(responseCode = "404", description = "Course review not found")
    })
    @GetMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseReviewResponse> getCourseReviewByIds(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        CourseReviewResponse review = courseReviewService.getCourseReviewByIds(courseId, userId);
        return AppApiResponse.<CourseReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.get.success", null, locale))
                .result(review)
                .build();
    }

    @Operation(summary = "Create a new course review", description = "Create a new course review with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Course review created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid course review data")
    })
    @PostMapping
    public AppApiResponse<CourseReviewResponse> createCourseReview(
            @Valid @RequestBody CourseReviewRequest request,
            Locale locale) {
        CourseReviewResponse review = courseReviewService.createCourseReview(request);
        return AppApiResponse.<CourseReviewResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseReview.created.success", null, locale))
                .result(review)
                .build();
    }

    @Operation(summary = "Update a course review", description = "Update an existing course review by courseId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course review updated successfully"),
            @ApiResponse(responseCode = "404", description = "Course review not found"),
            @ApiResponse(responseCode = "400", description = "Invalid course review data")
    })
    @PutMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseReviewResponse> updateCourseReview(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Valid @RequestBody CourseReviewRequest request,
            Locale locale) {
        CourseReviewResponse review = courseReviewService.updateCourseReview(courseId, userId, request);
        return AppApiResponse.<CourseReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.updated.success", null, locale))
                .result(review)
                .build();
    }

    @Operation(summary = "Delete a course review", description = "Soft delete a course review by courseId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course review deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Course review not found")
    })
    @DeleteMapping("/{courseId}/{userId}")
    public AppApiResponse<Void> deleteCourseReview(
            @Parameter(description = "Course ID") @PathVariable UUID courseId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        courseReviewService.deleteCourseReview(courseId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.deleted.success", null, locale))
                .build();
    }
}