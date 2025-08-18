package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardEntryService;
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
@RequestMapping("/api/leaderboard-entries")
@RequiredArgsConstructor
public class LeaderboardEntryController {
    private final LeaderboardEntryService leaderboardEntryService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all leaderboard entries", description = "Retrieve a paginated list of leaderboard entries with optional filtering by leaderboardId or userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved leaderboard entries"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LeaderboardEntryResponse>> getAllLeaderboardEntries(
            @Parameter(description = "Leaderboard ID filter") @RequestParam(required = false) String leaderboardId,
            @Parameter(description = "User ID filter") @RequestParam(required = false) String userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LeaderboardEntryResponse> entries = leaderboardEntryService.getAllLeaderboardEntries(leaderboardId, userId, pageable);
        return AppApiResponse.<Page<LeaderboardEntryResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboardEntry.list.success", null, locale))
                .result(entries)
                .build();
    }

    @Operation(summary = "Get leaderboard entry by IDs", description = "Retrieve a leaderboard entry by leaderboardId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved leaderboard entry"),
            @ApiResponse(responseCode = "404", description = "Leaderboard entry not found")
    })
    @GetMapping("/{leaderboardId}/{userId}")
    public AppApiResponse<LeaderboardEntryResponse> getLeaderboardEntryByIds(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID leaderboardId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        LeaderboardEntryResponse entry = leaderboardEntryService.getLeaderboardEntryByIds(leaderboardId, userId);
        return AppApiResponse.<LeaderboardEntryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboardEntry.get.success", null, locale))
                .result(entry)
                .build();
    }

    @Operation(summary = "Create a new leaderboard entry", description = "Create a new leaderboard entry with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Leaderboard entry created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid leaderboard entry data")
    })
    @PostMapping
    public AppApiResponse<LeaderboardEntryResponse> createLeaderboardEntry(
            @Valid @RequestBody LeaderboardEntryRequest request,
            Locale locale) {
        LeaderboardEntryResponse entry = leaderboardEntryService.createLeaderboardEntry(request);
        return AppApiResponse.<LeaderboardEntryResponse>builder()
                .code(201)
                .message(messageSource.getMessage("leaderboardEntry.created.success", null, locale))
                .result(entry)
                .build();
    }

    @Operation(summary = "Update a leaderboard entry", description = "Update an existing leaderboard entry by leaderboardId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leaderboard entry updated successfully"),
            @ApiResponse(responseCode = "404", description = "Leaderboard entry not found"),
            @ApiResponse(responseCode = "400", description = "Invalid leaderboard entry data")
    })
    @PutMapping("/{leaderboardId}/{userId}")
    public AppApiResponse<LeaderboardEntryResponse> updateLeaderboardEntry(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID leaderboardId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Valid @RequestBody LeaderboardEntryRequest request,
            Locale locale) {
        LeaderboardEntryResponse entry = leaderboardEntryService.updateLeaderboardEntry(leaderboardId, userId, request);
        return AppApiResponse.<LeaderboardEntryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboardEntry.updated.success", null, locale))
                .result(entry)
                .build();
    }

    @Operation(summary = "Delete a leaderboard entry", description = "Soft delete a leaderboard entry by leaderboardId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leaderboard entry deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Leaderboard entry not found")
    })
    @DeleteMapping("/{leaderboardId}/{userId}")
    public AppApiResponse<Void> deleteLeaderboardEntry(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID leaderboardId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        leaderboardEntryService.deleteLeaderboardEntry(leaderboardId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboardEntry.deleted.success", null, locale))
                .build();
    }
}