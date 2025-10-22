package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressWrongItemRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressWrongItemResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressWrongItemService;
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
@RequestMapping("/api/v1/lesson-progress-wrong-items")
@RequiredArgsConstructor
public class LessonProgressWrongItemController {
    private final LessonProgressWrongItemService lessonProgressWrongItemService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson progress wrong items", description = "Retrieve a paginated list of lesson progress wrong items with optional filtering by lessonId, userId, or lessonQuestionId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson progress wrong items"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonProgressWrongItemResponse>> getAllLessonProgressWrongItems(
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) UUID lessonId,
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Lesson question ID filter") @RequestParam(required = false) UUID lessonQuestionId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonProgressWrongItemResponse> wrongItems = lessonProgressWrongItemService.getAllLessonProgressWrongItems(lessonId, userId, lessonQuestionId, pageable);
        return AppApiResponse.<Page<LessonProgressWrongItemResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgressWrongItem.list.success", null, locale))
                .result(wrongItems)
                .build();
    }

    @Operation(summary = "Get lesson progress wrong item by IDs", description = "Retrieve a lesson progress wrong item by lessonId, userId, and lessonQuestionId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson progress wrong item"),
            @ApiResponse(responseCode = "404", description = "Lesson progress wrong item not found")
    })
    @GetMapping("/{lessonId}/{userId}/{lessonQuestionId}")
    public AppApiResponse<LessonProgressWrongItemResponse> getLessonProgressWrongItemByIds(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Lesson question ID") @PathVariable UUID lessonQuestionId,
            Locale locale) {
        LessonProgressWrongItemResponse wrongItem = lessonProgressWrongItemService.getLessonProgressWrongItemByIds(lessonId, userId, lessonQuestionId);
        return AppApiResponse.<LessonProgressWrongItemResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgressWrongItem.get.success", null, locale))
                .result(wrongItem)
                .build();
    }

    @Operation(summary = "Create a new lesson progress wrong item", description = "Create a new lesson progress wrong item with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson progress wrong item created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson progress wrong item data")
    })
    @PostMapping
    public AppApiResponse<LessonProgressWrongItemResponse> createLessonProgressWrongItem(
            @Valid @RequestBody LessonProgressWrongItemRequest request,
            Locale locale) {
        LessonProgressWrongItemResponse wrongItem = lessonProgressWrongItemService.createLessonProgressWrongItem(request);
        return AppApiResponse.<LessonProgressWrongItemResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonProgressWrongItem.created.success", null, locale))
                .result(wrongItem)
                .build();
    }

    @Operation(summary = "Update a lesson progress wrong item", description = "Update an existing lesson progress wrong item by lessonId, userId, and lessonQuestionId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson progress wrong item updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson progress wrong item not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson progress wrong item data")
    })
    @PutMapping("/{lessonId}/{userId}/{lessonQuestionId}")
    public AppApiResponse<LessonProgressWrongItemResponse> updateLessonProgressWrongItem(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Lesson question ID") @PathVariable UUID lessonQuestionId,
            @Valid @RequestBody LessonProgressWrongItemRequest request,
            Locale locale) {
        LessonProgressWrongItemResponse wrongItem = lessonProgressWrongItemService.updateLessonProgressWrongItem(lessonId, userId, lessonQuestionId, request);
        return AppApiResponse.<LessonProgressWrongItemResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgressWrongItem.updated.success", null, locale))
                .result(wrongItem)
                .build();
    }

    @Operation(summary = "Delete a lesson progress wrong item", description = "Soft delete a lesson progress wrong item by lessonId, userId, and lessonQuestionId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson progress wrong item deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson progress wrong item not found")
    })
    @DeleteMapping("/{lessonId}/{userId}/{lessonQuestionId}")
    public AppApiResponse<Void> deleteLessonProgressWrongItem(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Lesson question ID") @PathVariable UUID lessonQuestionId,
            Locale locale) {
        lessonProgressWrongItemService.deleteLessonProgressWrongItem(lessonId, userId, lessonQuestionId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonProgressWrongItem.deleted.success", null, locale))
                .build();
    }
}