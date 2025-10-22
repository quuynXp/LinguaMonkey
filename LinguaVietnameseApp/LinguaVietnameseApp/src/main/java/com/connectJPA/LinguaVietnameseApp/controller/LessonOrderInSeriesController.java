package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonOrderInSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonOrderInSeriesResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonOrderInSeriesService;
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
@RequestMapping("/api/v1/lesson-order-in-series")
@RequiredArgsConstructor
public class LessonOrderInSeriesController {
    private final LessonOrderInSeriesService lessonOrderInSeriesService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson orders in series", description = "Retrieve a paginated list of lesson orders with optional filtering by lessonId or lessonSeriesId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson orders"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonOrderInSeriesResponse>> getAllLessonOrdersInSeries(
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) String lessonId,
            @Parameter(description = "Lesson series ID filter") @RequestParam(required = false) String lessonSeriesId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonOrderInSeriesResponse> orders = lessonOrderInSeriesService.getAllLessonOrdersInSeries(lessonId, lessonSeriesId, pageable);
        return AppApiResponse.<Page<LessonOrderInSeriesResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonOrderInSeries.list.success", null, locale))
                .result(orders)
                .build();
    }

    @Operation(summary = "Get lesson order in series by IDs", description = "Retrieve a lesson order by lessonId and lessonSeriesId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson order"),
            @ApiResponse(responseCode = "404", description = "Lesson order not found")
    })
    @GetMapping("/{lessonId}/{lessonSeriesId}")
    public AppApiResponse<LessonOrderInSeriesResponse> getLessonOrderInSeriesByIds(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "Lesson series ID") @PathVariable UUID lessonSeriesId,
            Locale locale) {
        LessonOrderInSeriesResponse order = lessonOrderInSeriesService.getLessonOrderInSeriesByIds(lessonId, lessonSeriesId);
        return AppApiResponse.<LessonOrderInSeriesResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonOrderInSeries.get.success", null, locale))
                .result(order)
                .build();
    }

    @Operation(summary = "Create a new lesson order in series", description = "Create a new lesson order with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson order created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson order data")
    })
    @PostMapping
    public AppApiResponse<LessonOrderInSeriesResponse> createLessonOrderInSeries(
            @Valid @RequestBody LessonOrderInSeriesRequest request,
            Locale locale) {
        LessonOrderInSeriesResponse order = lessonOrderInSeriesService.createLessonOrderInSeries(request);
        return AppApiResponse.<LessonOrderInSeriesResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonOrderInSeries.created.success", null, locale))
                .result(order)
                .build();
    }

    @Operation(summary = "Update a lesson order in series", description = "Update an existing lesson order by lessonId and lessonSeriesId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson order updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson order not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson order data")
    })
    @PutMapping("/{lessonId}/{lessonSeriesId}")
    public AppApiResponse<LessonOrderInSeriesResponse> updateLessonOrderInSeries(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "Lesson series ID") @PathVariable UUID lessonSeriesId,
            @Valid @RequestBody LessonOrderInSeriesRequest request,
            Locale locale) {
        LessonOrderInSeriesResponse order = lessonOrderInSeriesService.updateLessonOrderInSeries(lessonId, lessonSeriesId, request);
        return AppApiResponse.<LessonOrderInSeriesResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonOrderInSeries.updated.success", null, locale))
                .result(order)
                .build();
    }

    @Operation(summary = "Delete a lesson order in series", description = "Soft delete a lesson order by lessonId and lessonSeriesId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson order deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson order not found")
    })
    @DeleteMapping("/{lessonId}/{lessonSeriesId}")
    public AppApiResponse<Void> deleteLessonOrderInSeries(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "Lesson series ID") @PathVariable UUID lessonSeriesId,
            Locale locale) {
        lessonOrderInSeriesService.deleteLessonOrderInSeries(lessonId, lessonSeriesId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonOrderInSeries.deleted.success", null, locale))
                .build();
    }
}