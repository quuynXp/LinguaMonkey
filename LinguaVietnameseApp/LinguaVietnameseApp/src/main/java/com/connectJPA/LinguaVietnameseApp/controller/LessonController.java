package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.service.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/lessons")
@Tag(name = "Lesson Management", description = "APIs for managing lessons categorized by lesson categories and subcategories")
@RequiredArgsConstructor
public class LessonController {
    private final LessonService lessonService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lessons", description = "Retrieve a paginated list of lessons with optional filtering by name, language, EXP reward, category, subcategory, course, or series")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters"),
            @ApiResponse(responseCode = "404", description = "Category or subcategory not found")
    })
    @GetMapping
    public AppApiResponse<Page<LessonResponse>> getAllLessons(
            @Parameter(description = "Lesson name filter") @RequestParam(required = false) String lessonName,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Minimum EXP reward filter") @RequestParam(required = false) Integer minExpReward,
            @Parameter(description = "Category ID filter (e.g., certificate-related)") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Subcategory ID filter (e.g., specific topic)") @RequestParam(required = false) UUID subCategoryId,
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Series ID filter") @RequestParam(required = false) UUID seriesId,
            @Parameter(description = "SkillType filter") @RequestParam(required = false) SkillType skillType,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        try {
            Page<LessonResponse> lessons = lessonService.getAllLessons(lessonName, languageCode, minExpReward, categoryId, subCategoryId, courseId, seriesId, skillType, pageable);
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.list.success", null, locale))
                    .result(lessons)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get lesson by ID", description = "Retrieve a lesson by its ID, including associated videos and questions")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson"),
            @ApiResponse(responseCode = "404", description = "Lesson not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonResponse> getLessonById(
            @Parameter(description = "Lesson ID") @PathVariable UUID id,
            Locale locale) {
        try {
            LessonResponse lesson = lessonService.getLessonById(id);
            return AppApiResponse.<LessonResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.get.success", null, locale))
                    .result(lesson)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<LessonResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Create a new lesson", description = "Create a new lesson with details, categorized by category and subcategory")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson data"),
            @ApiResponse(responseCode = "404", description = "Category or subcategory not found")
    })
    @PostMapping
    public AppApiResponse<LessonResponse> createLesson(
            @Valid @RequestBody LessonRequest request,
            Locale locale) {
        try {
            LessonResponse lesson = lessonService.createLesson(request);
            return AppApiResponse.<LessonResponse>builder()
                    .code(201)
                    .message(messageSource.getMessage("lesson.created.success", null, locale))
                    .result(lesson)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<LessonResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Update a lesson", description = "Update an existing lesson by its ID, including category and subcategory")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson or category/subcategory not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonResponse> updateLesson(
            @Parameter(description = "Lesson ID") @PathVariable UUID id,
            @Valid @RequestBody LessonRequest request,
            Locale locale) {
        try {
            LessonResponse lesson = lessonService.updateLesson(id, request);
            return AppApiResponse.<LessonResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.updated.success", null, locale))
                    .result(lesson)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<LessonResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Delete a lesson", description = "Soft delete a lesson by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLesson(
            @Parameter(description = "Lesson ID") @PathVariable UUID id,
            Locale locale) {
        try {
            lessonService.deleteLesson(id);
            return AppApiResponse.<Void>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.deleted.success", null, locale))
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Void>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Complete a lesson", description = "Mark a lesson as completed, award EXP to the user, and track progress")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson completed successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson or user not found")
    })
    @PostMapping("/{lessonId}/complete")
    public AppApiResponse<Void> completeLesson(
            @Parameter(description = "Lesson ID") @PathVariable UUID lessonId,
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Score achieved") @RequestParam(required = false) Integer score,
            Locale locale) {
        try {
            lessonService.completeLesson(lessonId, userId, score);
            return AppApiResponse.<Void>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.completed.success", null, locale))
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Void>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get lessons by skill type", description = "Retrieve lessons filtered by specific skill type (e.g., LISTENING, SPEAKING)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid skill type or pagination")
    })
    @GetMapping("/by-skill")
    public AppApiResponse<Page<LessonResponse>> getLessonsBySkillType(
            @Parameter(description = "Skill type filter") @RequestParam SkillType skillType,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        try {
            Page<LessonResponse> lessons = lessonService.getLessonsBySkillType(skillType, pageable);
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.list.skill.success", null, locale))
                    .result(lessons)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }

    @Operation(summary = "Get lessons by certificate or topic", description = "Retrieve lessons associated with a certificate or specific topic via category or subcategory")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lessons"),
            @ApiResponse(responseCode = "400", description = "Invalid pagination"),
            @ApiResponse(responseCode = "404", description = "Category or subcategory not found")
    })
    @GetMapping("/by-certificate-or-topic")
    public AppApiResponse<Page<LessonResponse>> getLessonsByCertificateOrTopic(
            @Parameter(description = "Category ID (e.g., certificate-related)") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Subcategory ID (e.g., specific topic)") @RequestParam(required = false) UUID subCategoryId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        try {
            Page<LessonResponse> lessons = lessonService.getLessonsByCertificateOrTopic(categoryId, subCategoryId, pageable);
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(200)
                    .message(messageSource.getMessage("lesson.list.certificate.success", null, locale))
                    .result(lessons)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<Page<LessonResponse>>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(messageSource.getMessage(e.getErrorCode().getMessage(), null, locale))
                    .build();
        }
    }
}