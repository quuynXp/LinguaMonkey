/**
 * Controller for managing lesson sub-category entities.
 * Provides endpoints for CRUD operations on lesson sub-categories, including pagination and filtering.
 * Secured with LESSON_SUB_CATEGORY_READ, LESSON_SUB_CATEGORY_WRITE, and LESSON_SUB_CATEGORY_DELETE permissions.
 */
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSubCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSubCategoryResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonSubCategoryService;
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
@RequestMapping("/api/v1/lesson-sub-categories")
@RequiredArgsConstructor
public class LessonSubCategoryController {
    private final LessonSubCategoryService lessonSubCategoryService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson sub-categories", description = "Retrieve a paginated list of lesson sub-categories with optional filtering by lessonCategoryId or languageCode")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson sub-categories"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonSubCategoryResponse>> getAllLessonSubCategories(
            @Parameter(description = "Lesson category ID filter") @RequestParam(required = false) String lessonCategoryId,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonSubCategoryResponse> subCategories = lessonSubCategoryService.getAllLessonSubCategories(lessonCategoryId, languageCode, pageable);
        return AppApiResponse.<Page<LessonSubCategoryResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSubCategory.list.success", null, locale))
                .result(subCategories)
                .build();
    }

    @Operation(summary = "Get lesson sub-category by ID", description = "Retrieve a lesson sub-category by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson sub-category"),
            @ApiResponse(responseCode = "404", description = "Lesson sub-category not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonSubCategoryResponse> getLessonSubCategoryById(
            @Parameter(description = "Lesson sub-category ID") @PathVariable UUID id,
            Locale locale) {
        LessonSubCategoryResponse subCategory = lessonSubCategoryService.getLessonSubCategoryById(id);
        return AppApiResponse.<LessonSubCategoryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSubCategory.get.success", null, locale))
                .result(subCategory)
                .build();
    }

    @Operation(summary = "Create a new lesson sub-category", description = "Create a new lesson sub-category with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson sub-category created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson sub-category data")
    })
    @PostMapping
    public AppApiResponse<LessonSubCategoryResponse> createLessonSubCategory(
            @Valid @RequestBody LessonSubCategoryRequest request,
            Locale locale) {
        LessonSubCategoryResponse subCategory = lessonSubCategoryService.createLessonSubCategory(request);
        return AppApiResponse.<LessonSubCategoryResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonSubCategory.created.success", null, locale))
                .result(subCategory)
                .build();
    }

    @Operation(summary = "Update a lesson sub-category", description = "Update an existing lesson sub-category by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson sub-category updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson sub-category not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson sub-category data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonSubCategoryResponse> updateLessonSubCategory(
            @Parameter(description = "Lesson sub-category ID") @PathVariable UUID id,
            @Valid @RequestBody LessonSubCategoryRequest request,
            Locale locale) {
        LessonSubCategoryResponse subCategory = lessonSubCategoryService.updateLessonSubCategory(id, request);
        return AppApiResponse.<LessonSubCategoryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSubCategory.updated.success", null, locale))
                .result(subCategory)
                .build();
    }

    @Operation(summary = "Delete a lesson sub-category", description = "Soft delete a lesson sub-category by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson sub-category deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson sub-category not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<Void> deleteLessonSubCategory(
            @Parameter(description = "Lesson sub-category ID") @PathVariable UUID id,
            Locale locale) {
        lessonSubCategoryService.deleteLessonSubCategory(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonSubCategory.deleted.success", null, locale))
                .build();
    }
}