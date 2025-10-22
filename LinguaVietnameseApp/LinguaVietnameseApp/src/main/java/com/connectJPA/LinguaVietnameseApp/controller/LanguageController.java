package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LanguageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LanguageResponse;
import com.connectJPA.LinguaVietnameseApp.service.LanguageService;
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
@RequestMapping("/api/v1/languages")
@RequiredArgsConstructor
public class LanguageController {
    private final LanguageService languageService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all languages", description = "Retrieve a paginated list of languages with optional filtering by languageCode or languageName")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved languages"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LanguageResponse>> getAllLanguages(
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Language name filter") @RequestParam(required = false) String languageName,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LanguageResponse> languages = languageService.getAllLanguages(languageCode, languageName, pageable);
        return AppApiResponse.<Page<LanguageResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("language.list.success", null, locale))
                .result(languages)
                .build();
    }

    @Operation(summary = "Get language by ID", description = "Retrieve a language by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved language"),
            @ApiResponse(responseCode = "404", description = "Language not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<LanguageResponse> getLanguageById(
            @Parameter(description = "Language ID") @PathVariable String languageCode,
            Locale locale) {
        LanguageResponse language = languageService.getLanguageByLanguageCode(languageCode);
        return AppApiResponse.<LanguageResponse>builder()
                .code(200)
                .message(messageSource.getMessage("language.get.success", null, locale))
                .result(language)
                .build();
    }

    @Operation(summary = "Create a new language", description = "Create a new language with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Language created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid language data")
    })
    @PostMapping
    public AppApiResponse<LanguageResponse> createLanguage(
            @Valid @RequestBody LanguageRequest request,
            Locale locale) {
        LanguageResponse language = languageService.createLanguage(request);
        return AppApiResponse.<LanguageResponse>builder()
                .code(201)
                .message(messageSource.getMessage("language.created.success", null, locale))
                .result(language)
                .build();
    }

    @Operation(summary = "Update a language", description = "Update an existing language by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Language updated successfully"),
            @ApiResponse(responseCode = "404", description = "Language not found"),
            @ApiResponse(responseCode = "400", description = "Invalid language data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<LanguageResponse> updateLanguage(
            @Parameter(description = "Language ID") @PathVariable String languageCode,
            @Valid @RequestBody LanguageRequest request,
            Locale locale) {
        LanguageResponse language = languageService.updateLanguage(languageCode, request);
        return AppApiResponse.<LanguageResponse>builder()
                .code(200)
                .message(messageSource.getMessage("language.updated.success", null, locale))
                .result(language)
                .build();
    }

    @Operation(summary = "Delete a language", description = "Soft delete a language by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Language deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Language not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLanguage(
            @Parameter(description = "Language ID") @PathVariable String languageCode,
            Locale locale) {
        languageService.deleteLanguage(languageCode);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("language.deleted.success", null, locale))
                .build();
    }
}