package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import com.connectJPA.LinguaVietnameseApp.service.BasicLessonService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/basic-lessons")
@RequiredArgsConstructor
@Tag(name = "Basic Lessons", description = "Core lessons like IPA, Hanzi, Kana, etc.")
public class BasicLessonController {

    private final BasicLessonService service;

    @PostMapping
    public AppApiResponse<BasicLessonResponse> create(@RequestBody @Valid BasicLessonRequest request) {
        return AppApiResponse.<BasicLessonResponse>builder()
                .code(200)
                .result(service.create(request))
                .message("Abc")
                .build();
    }

    @GetMapping("/{id}")
    public AppApiResponse<BasicLessonResponse> getById(@PathVariable UUID id) {
        return AppApiResponse.<BasicLessonResponse>builder()
                .code(200)
                .result(service.getById(id))
                .message("Success")
                .build();
    }

    @GetMapping
    public AppApiResponse<Page<BasicLessonResponse>> getByLanguageAndType(
            @RequestParam String languageCode,
            @RequestParam String lessonType,
            Pageable pageable
    ) {
        return AppApiResponse.<Page<BasicLessonResponse>>builder()
                .code(200)
                .result(service.getByLanguageAndType(languageCode, lessonType, pageable))
                .message("Sucessss")
                .build();
    }
}

