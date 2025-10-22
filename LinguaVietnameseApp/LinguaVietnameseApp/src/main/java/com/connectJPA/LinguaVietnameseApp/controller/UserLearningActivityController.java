package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserLearningActivityResponse;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
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
@RequestMapping("/api/v1/user-learning-activities")
@Tag(name = "User Learning Activity Management", description = "APIs for managing user learning activities")
@RequiredArgsConstructor
public class UserLearningActivityController {
    private final UserLearningActivityService userLearningActivityService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all user learning activities", description = "Retrieve a paginated list of user learning activities with optional filtering by userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user learning activities"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<Page<UserLearningActivityResponse>> getAllUserLearningActivities(
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<UserLearningActivityResponse> activities = userLearningActivityService.getAllUserLearningActivities(userId, pageable);
        return AppApiResponse.<Page<UserLearningActivityResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("userLearningActivity.list.success", null, locale))
                .result(activities)
                .build();
    }

    @Operation(summary = "Get user learning activity by ID", description = "Retrieve a user learning activity by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user learning activity"),
            @ApiResponse(responseCode = "404", description = "User learning activity not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserLearningActivityResponse> getUserLearningActivityById(
            @Parameter(description = "User learning activity ID") @PathVariable UUID id,
            Locale locale) {
        UserLearningActivityResponse activity = userLearningActivityService.getUserLearningActivityById(id);
        return AppApiResponse.<UserLearningActivityResponse>builder()
                .code(200)
                .message(messageSource.getMessage("userLearningActivity.get.success", null, locale))
                .result(activity)
                .build();
    }

    @Operation(summary = "Create a new user learning activity", description = "Create a new user learning activity with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User learning activity created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user learning activity data")
    })
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserLearningActivityResponse> createUserLearningActivity(
            @Valid @RequestBody UserLearningActivityRequest request,
            Locale locale) {
        UserLearningActivityResponse activity = userLearningActivityService.createUserLearningActivity(request);
        return AppApiResponse.<UserLearningActivityResponse>builder()
                .code(201)
                .message(messageSource.getMessage("userLearningActivity.created.success", null, locale))
                .result(activity)
                .build();
    }

    @Operation(summary = "Update a user learning activity", description = "Update an existing user learning activity by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User learning activity updated successfully"),
            @ApiResponse(responseCode = "404", description = "User learning activity not found"),
            @ApiResponse(responseCode = "400", description = "Invalid user learning activity data")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<UserLearningActivityResponse> updateUserLearningActivity(
            @Parameter(description = "User learning activity ID") @PathVariable UUID id,
            @Valid @RequestBody UserLearningActivityRequest request,
            Locale locale) {
        UserLearningActivityResponse activity = userLearningActivityService.updateUserLearningActivity(id, request);
        return AppApiResponse.<UserLearningActivityResponse>builder()
                .code(200)
                .message(messageSource.getMessage("userLearningActivity.updated.success", null, locale))
                .result(activity)
                .build();
    }

    @Operation(summary = "Delete a user learning activity", description = "Soft delete a user learning activity by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User learning activity deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User learning activity not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> deleteUserLearningActivity(
            @Parameter(description = "User learning activity ID") @PathVariable UUID id,
            Locale locale) {
        userLearningActivityService.deleteUserLearningActivity(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("userLearningActivity.deleted.success", null, locale))
                .build();
    }
}