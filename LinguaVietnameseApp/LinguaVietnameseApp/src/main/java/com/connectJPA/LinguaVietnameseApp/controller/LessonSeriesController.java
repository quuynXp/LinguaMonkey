/**
 * Controller for managing lesson series entities.
 * Provides endpoints for CRUD operations on lesson series, including pagination and filtering.
 * Secured with LESSON_SERIES_READ, LESSON_SERIES_WRITE, and LESSON_SERIES_DELETE permissions.
 */
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSeriesResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonSeriesService;
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
@RequestMapping("/api/lesson-series")
@RequiredArgsConstructor
public class LessonSeriesController {
    private final LessonSeriesService lessonSeriesService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson series", description = "Retrieve a paginated list of lesson series with optional filtering by lessonSeriesName or languageCode")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson series"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonSeriesResponse>> getAllLessonSeries(
            @Parameter(description = "Lesson series name filter") @RequestParam(required = false) String lessonSeriesName,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonSeriesResponse> series = lessonSeriesService.getAllLessonSeries(lessonSeriesName, languageCode, pageable);
        return AppApiResponse.<Page<LessonSeriesResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSeries.list.success", null, locale))
                .result(series)
                .build();
    }

    @Operation(summary = "Get lesson series by ID", description = "Retrieve a lesson series by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson series"),
            @ApiResponse(responseCode = "404", description = "Lesson series not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonSeriesResponse> getLessonSeriesById(
            @Parameter(description = "Lesson series ID") @PathVariable UUID id,
            Locale locale) {
        LessonSeriesResponse series = lessonSeriesService.getLessonSeriesById(id);
        return AppApiResponse.<LessonSeriesResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSeries.get.success", null, locale))
                .result(series)
                .build();
    }

    @Operation(summary = "Create a new lesson series", description = "Create a new lesson series with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson series created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson series data")
    })
    @PostMapping
    public AppApiResponse<LessonSeriesResponse> createLessonSeries(
            @Valid @RequestBody LessonSeriesRequest request,
            Locale locale) {
        LessonSeriesResponse series = lessonSeriesService.createLessonSeries(request);
        return AppApiResponse.<LessonSeriesResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonSeries.created.success", null, locale))
                .result(series)
                .build();
    }

    @Operation(summary = "Update a lesson series", description = "Update an existing lesson series by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson series updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson series not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson series data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonSeriesResponse> updateLessonSeries(
            @Parameter(description = "Lesson series ID") @PathVariable UUID id,
            @Valid @RequestBody LessonSeriesRequest request,
            Locale locale) {
        LessonSeriesResponse series = lessonSeriesService.updateLessonSeries(id, request);
        return AppApiResponse.<LessonSeriesResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSeries.updated.success", null, locale))
                .result(series)
                .build();
    }

    @Operation(summary = "Delete a lesson series", description = "Soft delete a lesson series by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson series deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson series not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLessonSeries(
            @Parameter(description = "Lesson series ID") @PathVariable UUID id,
            Locale locale) {
        lessonSeriesService.deleteLessonSeries(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSeries.deleted.success", null, locale))
                .build();
    }
}