package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonCategoryResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonCategoryService;
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
@RequestMapping("/api/v1/lesson-categories")
@RequiredArgsConstructor
public class LessonCategoryController {
    private final LessonCategoryService lessonCategoryService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson categories", description = "Retrieve a paginated list of lesson categories with optional filtering by lessonCategoryName or languageCode")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson categories"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonCategoryResponse>> getAllLessonCategories(
            @Parameter(description = "Lesson category name filter") @RequestParam(required = false) String lessonCategoryName,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonCategoryResponse> categories = lessonCategoryService.getAllLessonCategories(lessonCategoryName, languageCode, pageable);
        return AppApiResponse.<Page<LessonCategoryResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonCategory.list.success", null, locale))
                .result(categories)
                .build();
    }

    @Operation(summary = "Get lesson category by ID", description = "Retrieve a lesson category by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson category"),
            @ApiResponse(responseCode = "404", description = "Lesson category not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonCategoryResponse> getLessonCategoryById(
            @Parameter(description = "Lesson category ID") @PathVariable UUID id,
            Locale locale) {
        LessonCategoryResponse category = lessonCategoryService.getLessonCategoryById(id);
        return AppApiResponse.<LessonCategoryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonCategory.get.success", null, locale))
                .result(category)
                .build();
    }

    @Operation(summary = "Create a new lesson category", description = "Create a new lesson category with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson category created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson category data")
    })
    @PostMapping
    public AppApiResponse<LessonCategoryResponse> createLessonCategory(
            @Valid @RequestBody LessonCategoryRequest request,
            Locale locale) {
        LessonCategoryResponse category = lessonCategoryService.createLessonCategory(request);
        return AppApiResponse.<LessonCategoryResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonCategory.created.success", null, locale))
                .result(category)
                .build();
    }

    @Operation(summary = "Update a lesson category", description = "Update an existing lesson category by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson category updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson category not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson category data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonCategoryResponse> updateLessonCategory(
            @Parameter(description = "Lesson category ID") @PathVariable UUID id,
            @Valid @RequestBody LessonCategoryRequest request,
            Locale locale) {
        LessonCategoryResponse category = lessonCategoryService.updateLessonCategory(id, request);
        return AppApiResponse.<LessonCategoryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonCategory.updated.success", null, locale))
                .result(category)
                .build();
    }

    @Operation(summary = "Delete a lesson category", description = "Soft delete a lesson category by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson category deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson category not found")
    })
    @PreAuthorize("hasAuthority('LESSON_CATEGORY_DELETE')")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLessonCategory(
            @Parameter(description = "Lesson category ID") @PathVariable UUID id,
            Locale locale) {
        lessonCategoryService.deleteLessonCategory(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonCategory.deleted.success", null, locale))
                .build();
    }
}