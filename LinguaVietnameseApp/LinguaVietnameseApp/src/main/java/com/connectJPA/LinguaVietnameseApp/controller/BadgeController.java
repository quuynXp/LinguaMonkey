package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
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
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class BadgeController {
    private final BadgeService badgeService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all badges", description = "Retrieve a paginated list of badges with optional filtering by badgeName")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved badges"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<BadgeResponse>> getAllBadges(
            @Parameter(description = "Badge name filter") @RequestParam(required = false) String badgeName,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<BadgeResponse> badges = badgeService.getAllBadges(badgeName, pageable);
        return AppApiResponse.<Page<BadgeResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("badge.list.success", null, locale))
                .result(badges)
                .build();
    }

    @Operation(summary = "Get badge by ID", description = "Retrieve a badge by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved badge"),
            @ApiResponse(responseCode = "404", description = "Badge not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<BadgeResponse> getBadgeById(
            @Parameter(description = "Badge ID") @PathVariable UUID id,
            Locale locale) {
        BadgeResponse badge = badgeService.getBadgeById(id);
        return AppApiResponse.<BadgeResponse>builder()
                .code(200)
                .message(messageSource.getMessage("badge.get.success", null, locale))
                .result(badge)
                .build();
    }

    @Operation(summary = "Create a new badge", description = "Create a new badge with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Badge created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid badge data")
    })
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<BadgeResponse> createBadge(
            @Valid @RequestBody BadgeRequest request,
            Locale locale) {
        BadgeResponse badge = badgeService.createBadge(request);
        return AppApiResponse.<BadgeResponse>builder()
                .code(201)
                .message(messageSource.getMessage("badge.created.success", null, locale))
                .result(badge)
                .build();
    }

    @Operation(summary = "Update a badge", description = "Update an existing badge by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Badge updated successfully"),
            @ApiResponse(responseCode = "404", description = "Badge not found"),
            @ApiResponse(responseCode = "400", description = "Invalid badge data")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<BadgeResponse> updateBadge(
            @Parameter(description = "Badge ID") @PathVariable UUID id,
            @Valid @RequestBody BadgeRequest request,
            Locale locale) {
        BadgeResponse badge = badgeService.updateBadge(id, request);
        return AppApiResponse.<BadgeResponse>builder()
                .code(200)
                .message(messageSource.getMessage("badge.updated.success", null, locale))
                .result(badge)
                .build();
    }

    @Operation(summary = "Delete a badge", description = "Soft delete a badge by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Badge deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Badge not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> deleteBadge(
            @Parameter(description = "Badge ID") @PathVariable UUID id,
            Locale locale) {
        badgeService.deleteBadge(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("badge.deleted.success", null, locale))
                .build();
    }
}