package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardEntryService;
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
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final LeaderboardEntryService leaderboardEntryService;

    @Operation(summary = "Get all leaderboards", description = "Retrieve a paginated list of leaderboards with optional filtering by period or tab")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved leaderboards"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<LeaderboardResponse>> getAllLeaderboards(
            @Parameter(description = "Period filter") @RequestParam(required = false) String period,
            @Parameter(description = "Tab filter") @RequestParam(required = false) String tab,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<LeaderboardResponse> leaderboards = leaderboardService.getAllLeaderboards(period, tab, pageable);
        return AppApiResponse.<Page<LeaderboardResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.list.success", null, locale))
                .result(leaderboards)
                .build();
    }

    @Operation(summary = "Get leaderboard by ID", description = "Retrieve a leaderboard by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved leaderboard"),
            @ApiResponse(responseCode = "404", description = "Leaderboard not found")
    })
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

//    @GetMapping("/global/top-3")
//    public AppApiResponse<List<LeaderboardEntryResponse>> getGlobalTopThree() {
//        List<LeaderboardEntryResponse> topUsers = leaderboardService.getGlobalTopThree();
//
//        return AppApiResponse.<List<LeaderboardEntryResponse>>builder()
//                .code(200)
//                .result(topUsers)
//                .message("Successfully retrieved top 3 users")
//                .build();
//    }

    @Operation(summary = "Create a new leaderboard", description = "Create a new leaderboard with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Leaderboard created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid leaderboard data")
    })
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

    @Operation(summary = "Update a leaderboard", description = "Update an existing leaderboard by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leaderboard updated successfully"),
            @ApiResponse(responseCode = "404", description = "Leaderboard not found"),
            @ApiResponse(responseCode = "400", description = "Invalid leaderboard data")
    })
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

    @Operation(summary = "Delete a leaderboard", description = "Soft delete a leaderboard by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leaderboard deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Leaderboard not found")
    })
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

   @Operation(summary = "Get top 3 leaderboard entries", description = "Retrieve the top 3 leaderboard entries for a specific leaderboard ID")
   @ApiResponses({
           @ApiResponse(responseCode = "200", description = "Successfully retrieved top 3 leaderboard entries"),
           @ApiResponse(responseCode = "400", description = "Invalid leaderboard ID"),
           @ApiResponse(responseCode = "404", description = "Leaderboard not found")
   })
   @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}/top-3")
   public AppApiResponse<List<LeaderboardEntryResponse>> getTop3LeaderboardEntries(
           @Parameter(description = "Leaderboard ID") @PathVariable UUID id,
           Locale locale) {
       List<LeaderboardEntryResponse> topEntries = leaderboardEntryService.getTop3LeaderboardEntries(id);
       return AppApiResponse.<List<LeaderboardEntryResponse>>builder()
               .code(200)
               .message(messageSource.getMessage("leaderboard.top3.success", null, locale))
               .result(topEntries)
               .build();
   }

    @Operation(summary = "Get top 3 global leaderboard entries", description = "Retrieve the top 3 leaderboard entries for the global leaderboard")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved top 3 global leaderboard entries"),
            @ApiResponse(responseCode = "404", description = "Global leaderboard not found")
    })
    @GetMapping("/global/top-3")
    public AppApiResponse<List<LeaderboardEntryResponse>> getTop3GlobalLeaderboardEntries(Locale locale) {
        List<LeaderboardEntryResponse> topEntries = leaderboardEntryService.getTop3GlobalLeaderboardEntries();
        return AppApiResponse.<List<LeaderboardEntryResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("leaderboard.top3.global.success", null, locale))
                .result(topEntries)
                .build();
    }
}