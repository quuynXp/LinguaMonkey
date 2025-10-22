package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonQuestionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonQuestionResponse;
import com.connectJPA.LinguaVietnameseApp.service.LessonQuestionService;
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
@RequestMapping("/api/v1/lesson-questions")
@RequiredArgsConstructor
public class LessonQuestionController {
    private final LessonQuestionService lessonQuestionService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all lesson questions", description = "Retrieve a paginated list of lesson questions with optional filtering by lessonId or languageCode")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson questions"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LessonQuestionResponse>> getAllLessonQuestions(
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) String lessonId,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LessonQuestionResponse> questions = lessonQuestionService.getAllLessonQuestions(lessonId, languageCode, pageable);
        return AppApiResponse.<Page<LessonQuestionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("lessonQuestion.list.success", null, locale))
                .result(questions)
                .build();
    }

    @Operation(summary = "Get lesson question by ID", description = "Retrieve a lesson question by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved lesson question"),
            @ApiResponse(responseCode = "404", description = "Lesson question not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LessonQuestionResponse> getLessonQuestionById(
            @Parameter(description = "Lesson question ID") @PathVariable UUID id,
            Locale locale) {
        LessonQuestionResponse question = lessonQuestionService.getLessonQuestionById(id);
        return AppApiResponse.<LessonQuestionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonQuestion.get.success", null, locale))
                .result(question)
                .build();
    }

    @Operation(summary = "Create a new lesson question", description = "Create a new lesson question with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Lesson question created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson question data")
    })
    @PostMapping
    public AppApiResponse<LessonQuestionResponse> createLessonQuestion(
            @Valid @RequestBody LessonQuestionRequest request,
            Locale locale) {
        LessonQuestionResponse question = lessonQuestionService.createLessonQuestion(request);
        return AppApiResponse.<LessonQuestionResponse>builder()
                .code(201)
                .message(messageSource.getMessage("lessonQuestion.created.success", null, locale))
                .result(question)
                .build();
    }

    @Operation(summary = "Update a lesson question", description = "Update an existing lesson question by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson question updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson question not found"),
            @ApiResponse(responseCode = "400", description = "Invalid lesson question data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LessonQuestionResponse> updateLessonQuestion(
            @Parameter(description = "Lesson question ID") @PathVariable UUID id,
            @Valid @RequestBody LessonQuestionRequest request,
            Locale locale) {
        LessonQuestionResponse question = lessonQuestionService.updateLessonQuestion(id, request);
        return AppApiResponse.<LessonQuestionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("lessonQuestion.updated.success", null, locale))
                .result(question)
                .build();
    }

    @Operation(summary = "Delete a lesson question", description = "Soft delete a lesson question by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lesson question deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lesson question not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLessonQuestion(
            @Parameter(description = "Lesson question ID") @PathVariable UUID id,
            Locale locale) {
        lessonQuestionService.deleteLessonQuestion(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("lessonQuestion.deleted.success", null, locale))
                .build();
    }
}