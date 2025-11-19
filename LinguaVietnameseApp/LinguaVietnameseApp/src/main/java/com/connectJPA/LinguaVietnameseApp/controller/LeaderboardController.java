package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leaderboards")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final MessageSource messageSource;

    @Operation(summary = "Get leaderboards by tab", description = "Retrieve leaderboards for a specific category (global, friends, couples, country)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved leaderboards"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LeaderboardResponse>> getAllLeaderboards(
            @Parameter(description = "Tab name: global, friends, couples, country") @RequestParam(required = true) String tab,
            @Parameter(description = "Pagination") Pageable pageable,
            Locale locale) {

        Page<LeaderboardResponse> leaderboards = leaderboardService.getAllLeaderboards(tab, pageable);

        return AppApiResponse.<Page<LeaderboardResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.list.success", null, locale))
                .result(leaderboards)
                .build();
    }

    @Operation(summary = "Get global top 3")
    @GetMapping("/top-3")
    public AppApiResponse<List<LeaderboardEntryResponse>> getGlobalTopThree(Locale locale) {
        List<LeaderboardEntryResponse> topThree = leaderboardService.getGlobalTopThree();

        return AppApiResponse.<List<LeaderboardEntryResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.top3.success", null, locale))
                .result(topThree)
                .build();
    }

    @Operation(summary = "Get leaderboard by ID")
    @GetMapping("/{id}")
    public AppApiResponse<LeaderboardResponse> getLeaderboardById(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID id,
            Locale locale) {

        LeaderboardResponse leaderboard = leaderboardService.getLeaderboardById(id);

        return AppApiResponse.<LeaderboardResponse>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.get.success", null, locale))
                .result(leaderboard)
                .build();
    }

    @Operation(summary = "Get top 3 for specific leaderboard")
    @GetMapping("/{id}/top-3")
    public AppApiResponse<List<LeaderboardEntryResponse>> getLeaderboardTopThree(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID id,
            Locale locale) {

        // Call service that fetches top 3 for this leaderboard
        List<LeaderboardEntryResponse> topThree = leaderboardService.getLeaderboardTopThreeById(id);

        return AppApiResponse.<List<LeaderboardEntryResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.top3.success", null, locale))
                .result(topThree)
                .build();
    }

    @Operation(summary = "Create leaderboard")
    @PostMapping
    public AppApiResponse<LeaderboardResponse> createLeaderboard(
            @Valid @RequestBody LeaderboardRequest request,
            Locale locale) {

        LeaderboardResponse leaderboard = leaderboardService.createLeaderboard(request);

        return AppApiResponse.<LeaderboardResponse>builder()
                .code(201)
                .message(messageSource.getMessage("leaderboard.created.success", null, locale))
                .result(leaderboard)
                .build();
    }

    @Operation(summary = "Update leaderboard")
    @PutMapping("/{id}")
    public AppApiResponse<LeaderboardResponse> updateLeaderboard(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID id,
            @Valid @RequestBody LeaderboardRequest request,
            Locale locale) {

        LeaderboardResponse leaderboard = leaderboardService.updateLeaderboard(id, request);

        return AppApiResponse.<LeaderboardResponse>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.updated.success", null, locale))
                .result(leaderboard)
                .build();
    }

    @Operation(summary = "Delete leaderboard")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteLeaderboard(
            @Parameter(description = "Leaderboard ID") @PathVariable UUID id,
            Locale locale) {

        leaderboardService.deleteLeaderboard(id);

        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.deleted.success", null, locale))
                .build();
    }
}