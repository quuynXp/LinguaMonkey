package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonReviewResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lesson-reviews")
@Tag(name = "Lesson Review Management", description = "APIs for managing lesson reviews")
@RequiredArgsConstructor
public class LessonReviewController {
    private final LessonReviewService lessonReviewService;
    private final MessageSource messageSource;

    @Operation(summary = "Create a new lesson review", description = "Create a new review for a lesson")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Successfully created lesson review"),
            @ApiResponse(responseCode = "400", description = "Invalid input data")
    })
    @PostMapping
    public AppApiResponse<LessonReviewResponse> createLessonReview(
            @RequestBody LessonReviewRequest request,
            Locale locale) {
        LessonReviewResponse response = lessonReviewService.createLessonReview(request);
        return AppApiResponse.<LessonReviewResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonReview.create.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Get lesson review by ID", description = "Retrieve a specific lesson review by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson review"),
            @ApiResponse(responseCode = "404", description = "Lesson review not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonReviewResponse> getLessonReviewById(
            @Parameter(description = "Lesson review ID") @PathVariable UUID id,
            Locale locale) {
        LessonReviewResponse response = lessonReviewService.getLessonReviewById(id);
        return AppApiResponse.<LessonReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonReview.get.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Get all lesson reviews", description = "Retrieve a paginated list of all lesson reviews")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson reviews")
    })
    @GetMapping
    public AppApiResponse<Page<LessonReviewResponse>> getAllLessonReviews(
            @Parameter(description = "Pagination and sorting parameters") Pageable pageable,
            Locale locale) {
        Page<LessonReviewResponse> responses = lessonReviewService.getAllLessonReviews(pageable);
        return AppApiResponse.<Page<LessonReviewResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonReview.list.success", null, locale))
                .result(responses)
                .build();
    }

    @Operation(summary = "Update a lesson review", description = "Update an existing lesson review by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully updated lesson review"),
            @ApiResponse(responseCode = "404", description = "Lesson review not found"),
            @ApiResponse(responseCode = "400", description = "Invalid input data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonReviewResponse> updateLessonReview(
            @Parameter(description = "Lesson review ID") @PathVariable UUID id,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @RequestBody LessonReviewRequest request,
            Locale locale) {
        LessonReviewResponse response = lessonReviewService.updateLessonReview(id, userId, request);
        return AppApiResponse.<LessonReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonReview.update.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Delete a lesson review", description = "Delete an existing lesson review by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Successfully deleted lesson review"),
            @ApiResponse(responseCode = "404", description = "Lesson review not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLessonReview(
            @Parameter(description = "Lesson review ID") @PathVariable UUID id,
            Locale locale) {
        lessonReviewService.deleteLessonReview(id);
        return AppApiResponse.<Void>builder()
                .code(204)
                .message(messageSource.getMessage("lessonReview.delete.success", null, locale))
                .build();
    }
}