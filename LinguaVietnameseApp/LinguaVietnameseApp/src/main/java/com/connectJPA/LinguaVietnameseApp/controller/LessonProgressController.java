package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressService;
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
@RequestMapping("/api/lesson-progress")
@RequiredArgsConstructor
public class LessonProgressController {
    private final LessonProgressService lessonProgressService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson progress", description = "Retrieve a paginated list of lesson progress with optional filtering by lessonId or userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson progress"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonProgressResponse>> getAllLessonProgress(
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) String lessonId,
            @Parameter(description = "User ID filter") @RequestParam(required = false) String userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonProgressResponse> progress = lessonProgressService.getAllLessonProgress(lessonId, userId, pageable);
        return AppApiResponse.<Page<LessonProgressResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgress.list.success", null, locale))
                .result(progress)
                .build();
    }

    @Operation(summary = "Get lesson progress by IDs", description = "Retrieve a lesson progress by lessonId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson progress"),
            @ApiResponse(responseCode = "404", description = "Lesson progress not found")
    })
    @GetMapping("/{lessonId}/{userId}")
    public AppApiResponse<LessonProgressResponse> getLessonProgressByIds(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        LessonProgressResponse progress = lessonProgressService.getLessonProgressByIds(lessonId, userId);
        return AppApiResponse.<LessonProgressResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgress.get.success", null, locale))
                .result(progress)
                .build();
    }

    @Operation(summary = "Create a new lesson progress", description = "Create a new lesson progress with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson progress created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson progress data")
    })
    @PostMapping
    public AppApiResponse<LessonProgressResponse> createLessonProgress(
            @Valid @RequestBody LessonProgressRequest request,
            Locale locale) {
        LessonProgressResponse progress = lessonProgressService.createLessonProgress(request);
        return AppApiResponse.<LessonProgressResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonProgress.created.success", null, locale))
                .result(progress)
                .build();
    }

    @Operation(summary = "Update a lesson progress", description = "Update an existing lesson progress by lessonId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson progress updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson progress not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson progress data")
    })
    @PutMapping("/{lessonId}/{userId}")
    public AppApiResponse<LessonProgressResponse> updateLessonProgress(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Valid @RequestBody LessonProgressRequest request,
            Locale locale) {
        LessonProgressResponse progress = lessonProgressService.updateLessonProgress(lessonId, userId, request);
        return AppApiResponse.<LessonProgressResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgress.updated.success", null, locale))
                .result(progress)
                .build();
    }

    @Operation(summary = "Delete a lesson progress", description = "Soft delete a lesson progress by lessonId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson progress deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson progress not found")
    })
    @DeleteMapping("/{lessonId}/{userId}")
    public AppApiResponse<Void> deleteLessonProgress(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        lessonProgressService.deleteLessonProgress(lessonId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgress.deleted.success", null, locale))
                .build();
    }
}