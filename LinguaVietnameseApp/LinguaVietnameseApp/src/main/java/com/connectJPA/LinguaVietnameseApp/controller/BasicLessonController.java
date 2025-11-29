package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PronunciationPracticeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.service.BasicLessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/v1/basic-lessons")
@RequiredArgsConstructor
@Tag(name = "Basic Lessons", description = "Core lessons like IPA, Hanzi, Kana with AI enrichment capabilities")
public class BasicLessonController {

    private final BasicLessonService service;

    @PostMapping
    @Operation(summary = "Create a new basic lesson")
    public AppApiResponse<BasicLessonResponse> create(@RequestBody @Valid BasicLessonRequest request) {
        return AppApiResponse.<BasicLessonResponse>builder()
                .code(200)
                .result(service.create(request))
                .message("Created successfully")
                .build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get basic lesson details by ID")
    public AppApiResponse<BasicLessonResponse> getById(@PathVariable UUID id) {
        return AppApiResponse.<BasicLessonResponse>builder()
                .code(200)
                .result(service.getById(id))
                .message("Success")
                .build();
    }

    @PostMapping("/{id}/enrich")
    @Operation(summary = "Enrich basic lesson data using AI", description = "Checks if audio/examples/video are missing and populates them.")
    public AppApiResponse<BasicLessonResponse> enrich(@PathVariable UUID id) {
        return AppApiResponse.<BasicLessonResponse>builder()
                .code(200)
                .result(service.enrichLesson(id))
                .message("Enriched successfully")
                .build();
    }

    @GetMapping
    @Operation(summary = "List basic lessons by language and type")
    public AppApiResponse<Page<BasicLessonResponse>> getByLanguageAndType(
            @RequestParam String languageCode,
            @RequestParam String lessonType,
            Pageable pageable
    ) {
        return AppApiResponse.<Page<BasicLessonResponse>>builder()
                .code(200)
                .result(service.getByLanguageAndType(languageCode, lessonType, pageable))
                .message("Success")
                .build();
    }

    @PostMapping("/practice")
    @Operation(summary = "Check pronunciation for a basic lesson symbol")
    public AppApiResponse<PronunciationResponseBody> checkPronunciation(@RequestBody @Valid PronunciationPracticeRequest request) {
        try {
            return AppApiResponse.<PronunciationResponseBody>builder()
                    .code(200)
                    .result(service.checkPronunciation(request))
                    .message("Analyzed successfully")
                    .build();
        } catch (Exception e) {
            return AppApiResponse.<PronunciationResponseBody>builder()
                    .code(500)
                    .message("Analysis failed: " + e.getMessage())
                    .build();
        }
    }
}