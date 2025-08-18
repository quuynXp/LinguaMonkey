package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.StatisticsResponse;
import com.connectJPA.LinguaVietnameseApp.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    private final StatisticsService statisticsService;
    private final MessageSource messageSource;

    @Operation(summary = "Get user statistics", description = "Retrieve statistics for a user within a date range, including correct/incorrect answers and total exercises")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Invalid date range")
    })
    @PreAuthorize("hasRole('ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#id)")
    @GetMapping("/user/{userId}")
    public AppApiResponse<StatisticsResponse> getUserStatistics(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Locale locale) {
        StatisticsResponse statistics = statisticsService.getUserStatistics(userId, startDate, endDate);
        return AppApiResponse.<StatisticsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.get.success", null, locale))
                .result(statistics)
                .build();
    }
}