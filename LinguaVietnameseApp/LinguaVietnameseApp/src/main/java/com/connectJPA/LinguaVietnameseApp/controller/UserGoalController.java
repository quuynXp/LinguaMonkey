package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserGoalRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserGoalResponse;
import com.connectJPA.LinguaVietnameseApp.service.UserGoalService;
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
@RequestMapping("/api/user-goals")
@Tag(name = "User Goal Management", description = "APIs for managing user goals")
@RequiredArgsConstructor
public class UserGoalController {
    private final UserGoalService userGoalService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all user goals", description = "Retrieve a paginated list of user goals with optional filtering by userId or languageCode")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user goals"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<UserGoalResponse>> getAllUserGoals(
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Language code filter") @RequestParam(required = false) String languageCode,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<UserGoalResponse> goals = userGoalService.getAllUserGoals(userId, languageCode, pageable);
        return AppApiResponse.<Page<UserGoalResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("userGoal.list.success", null, locale))
                .result(goals)
                .build();
    }

    @Operation(summary = "Get user goal by ID", description = "Retrieve a user goal by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user goal"),
            @ApiResponse(responseCode = "404", description = "User goal not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<UserGoalResponse> getUserGoalById(
            @Parameter(description = "User goal ID") @PathVariable UUID id,
            Locale locale) {
        UserGoalResponse goal = userGoalService.getUserGoalById(id);
        return AppApiResponse.<UserGoalResponse>builder()
                .code(200)
                .message(messageSource.getMessage("userGoal.get.success", null, locale))
                .result(goal)
                .build();
    }

    @Operation(summary = "Create a new user goal", description = "Create a new user goal with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User goal created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user goal data")
    })
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserGoalResponse> createUserGoal(
            @Valid @RequestBody UserGoalRequest request,
            Locale locale) {
        UserGoalResponse goal = userGoalService.createUserGoal(request);
        return AppApiResponse.<UserGoalResponse>builder()
                .code(201)
                .message(messageSource.getMessage("userGoal.created.success", null, locale))
                .result(goal)
                .build();
    }

    @Operation(summary = "Update a user goal", description = "Update an existing user goal by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User goal updated successfully"),
            @ApiResponse(responseCode = "404", description = "User goal not found"),
            @ApiResponse(responseCode = "400", description = "Invalid user goal data")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserGoalResponse> updateUserGoal(
            @Parameter(description = "User goal ID") @PathVariable UUID id,
            @Valid @RequestBody UserGoalRequest request,
            Locale locale) {
        UserGoalResponse goal = userGoalService.updateUserGoal(id, request);
        return AppApiResponse.<UserGoalResponse>builder()
                .code(200)
                .message(messageSource.getMessage("userGoal.updated.success", null, locale))
                .result(goal)
                .build();
    }

    @Operation(summary = "Delete a user goal", description = "Soft delete a user goal by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User goal deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User goal not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<Void> deleteUserGoal(
            @Parameter(description = "User goal ID") @PathVariable UUID id,
            Locale locale) {
        userGoalService.deleteUserGoal(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("userGoal.deleted.success", null, locale))
                .build();
    }
}