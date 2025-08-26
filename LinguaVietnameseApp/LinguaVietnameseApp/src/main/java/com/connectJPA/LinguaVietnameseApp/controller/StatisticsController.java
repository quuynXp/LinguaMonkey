package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    private final StatisticsService statisticsService;
    private final MessageSource messageSource;

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/overview")
    public AppApiResponse<StatisticsOverviewResponse> overview(
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String startDateStr,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String endDateStr,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(required = false, defaultValue = "day") String aggregate
    ) {
        // parse / default dates
        LocalDate today = LocalDate.now();
        LocalDate startDate = null;
        LocalDate endDate = null;

        try {
            if (startDateStr != null && endDateStr != null) {
                startDate = LocalDate.parse(startDateStr);
                endDate = LocalDate.parse(endDateStr);
            } else {
                // derive from period
                if (period != null) {
                    switch (period.toLowerCase()) {
                        case "day" -> {
                            startDate = today;
                            endDate = today;
                        }
                        case "month" -> {
                            endDate = today;
                            startDate = today.minusMonths(1).plusDays(1);
                        }
                        case "year" -> {
                            endDate = today;
                            startDate = today.minusYears(1).plusDays(1);
                        }
                        default -> {
                            endDate = today;
                            startDate = today.minusWeeks(1).plusDays(1);
                        }
                    }
                } else {
                    // fallback 7 days
                    endDate = today;
                    startDate = today.minusWeeks(1).plusDays(1);
                }
            }
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date format. Use yyyy-MM-dd");
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        StatisticsOverviewResponse resp = statisticsService.getOverview(userId, startDate, endDate, aggregate);

        Locale locale = LocaleContextHolder.getLocale();
        String msg = messageSource.getMessage("statistics.get.success", null, "OK", locale);

        return AppApiResponse.<StatisticsOverviewResponse>builder()
                .code(200)
                .message(msg)
                .result(resp)
                .build();
    }


    @Operation(summary = "Get user statistics", description = "Retrieve statistics for a user within a date range, including correct/incorrect answers and total exercises")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved statistics"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Invalid date range")
    })
    @PreAuthorize("@PreAuthorize(\"hasAuthority('ROLE_ADMIN')\")  or T(java.util.UUID).fromString(authentication.name).equals(#id)")
    @GetMapping("/user/{userId}")
    public AppApiResponse<StatisticsResponse> getUserStatistics(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @RequestParam(required = false) String period,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Locale locale) {

        // Nếu không truyền start/end thì set theo period (phải làm trước khi gọi service)
        LocalDate today = LocalDate.now();
        if (startDate == null || endDate == null) {
            if (period != null) {
                switch (period.toLowerCase()) {
                    case "day" -> {
                        startDate = today;
                        endDate = today;
                    }
                    case "month" -> {
                        endDate = today;
                        startDate = today.minusMonths(1).plusDays(1);
                    }
                    case "year" -> {
                        endDate = today;
                        startDate = today.minusYears(1).plusDays(1);
                    }
                    default -> {
                        endDate = today;
                        startDate = today.minusWeeks(1).plusDays(1);
                    }
                }
            } else {
                // fallback 7 ngày
                endDate = today;
                startDate = today.minusWeeks(1).plusDays(1);
            }
        }

        // Validate: nếu FE truyền startDate > endDate
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        // Gọi service sau khi đã có startDate/endDate
        StatisticsResponse statistics = statisticsService.getUserStatistics(userId, startDate, endDate);

        return AppApiResponse.<StatisticsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.get.success", null, locale))
                .result(statistics)
                .build();
    }

    // --- users/count & users/growth (giữ nguyên) ---

    @Operation(summary = "Get user count statistics", description = "Retrieve user counts by period (day, month, year) with optional filters")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user counts"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/users/count")
    public AppApiResponse<List<UserCountResponse>> getUserCounts(
            @RequestParam String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Locale locale) {

        LocalDate today = LocalDate.now();

        if (startDate == null || endDate == null) {
            switch (period.toLowerCase()) {
                case "day" -> {
                    startDate = today;
                    endDate = today;
                }
                case "month" -> {
                    endDate = today;
                    startDate = today.minusMonths(1).plusDays(1);
                }
                case "year" -> {
                    endDate = today;
                    startDate = today.minusYears(1).plusDays(1);
                }
                default -> {
                    endDate = today;
                    startDate = today.minusWeeks(1).plusDays(1);
                }
            }
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        List<UserCountResponse> counts = statisticsService.getUserCounts(period, startDate, endDate);
        return AppApiResponse.<List<UserCountResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.users.count.success", null, locale))
                .result(counts)
                .build();
    }

    @Operation(summary = "Get user growth statistics", description = "Retrieve user growth (increase/decrease, percentage) by period")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user growth"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/users/growth")
    public AppApiResponse<List<UserCountResponse>> getUserGrowth(
            @Parameter(description = "Period: day, month, year") @RequestParam String period,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Locale locale) {

        LocalDate today = LocalDate.now();

        if (startDate == null || endDate == null) {
            switch (period.toLowerCase()) {
                case "day" -> {
                    startDate = today;
                    endDate = today;
                }
                case "month" -> {
                    endDate = today;
                    startDate = today.minusMonths(1).plusDays(1);
                }
                case "year" -> {
                    endDate = today;
                    startDate = today.minusYears(1).plusDays(1);
                }
                default -> {
                    endDate = today;
                    startDate = today.minusWeeks(1).plusDays(1);
                }
            }
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        List<UserCountResponse> growth = statisticsService.getUserGrowth(period, startDate, endDate);
        return AppApiResponse.<List<UserCountResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.users.growth.success", null, locale))
                .result(growth)
                .build();
    }

    @Operation(summary = "Get user activity statistics", description = "Retrieve counts of user activities by type and period")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved activity statistics"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/activities")
    public AppApiResponse<List<ActivityCountResponse>> getActivityStatistics(
            @Parameter(description = "Activity type (optional)") @RequestParam(required = false) String activityType,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Period shortcut (optional): day, week, month, year") @RequestParam(required = false) String period,
            Locale locale) {

        // If client provided period, use it to compute start/end when they're missing
        if (period != null && (startDate == null || endDate == null)) {
            LocalDate today = LocalDate.now();
            switch (period.toLowerCase()) {
                case "day" -> {
                    startDate = today;
                    endDate = today;
                }
                case "week" -> {
                    endDate = today;
                    startDate = today.minusWeeks(1).plusDays(1); // last 7 days
                }
                case "month" -> {
                    endDate = today;
                    startDate = today.minusMonths(1).plusDays(1);
                }
                case "year" -> {
                    endDate = today;
                    startDate = today.minusYears(1).plusDays(1);
                }
                default -> {
                    // fallback to last 7 days
                    endDate = today;
                    startDate = today.minusWeeks(1).plusDays(1);
                }
            }
        }

        if (startDate == null) startDate = LocalDate.now().minusWeeks(1).plusDays(1);
        if (endDate == null) endDate = LocalDate.now();

        List<ActivityCountResponse> activities = statisticsService.getActivityStatistics(activityType, startDate, endDate, period);
        return AppApiResponse.<List<ActivityCountResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.activities.success", null, locale))
                .result(activities)
                .build();
    }

    @Operation(summary = "Get transaction statistics", description = "Retrieve transaction counts/sums by status/provider and period")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved transaction statistics"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/transactions")
    public AppApiResponse<List<TransactionStatsResponse>> getTransactionStatistics(
            @Parameter(description = "Status (optional)") @RequestParam(required = false) String status,
            @Parameter(description = "Period shortcut (optional): day, week, month, year") @RequestParam(required = false) String period,
            @Parameter(description = "Provider (optional)") @RequestParam(required = false) String provider,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Locale locale) {


        // Nếu không truyền start/end thì set theo period
        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();

            if (period != null) {
                switch (period.toLowerCase()) {
                    case "day" -> {
                        startDate = today;
                        endDate = today;
                    }
                    case "week" -> {
                        endDate = today;
                        startDate = today.minusWeeks(1).plusDays(1);
                    }
                    case "month" -> {
                        endDate = today;
                        startDate = today.minusMonths(1).plusDays(1);
                    }
                    case "year" -> {
                        endDate = today;
                        startDate = today.minusYears(1).plusDays(1);
                    }
                    default -> {
                        // fallback 7 ngày gần nhất
                        endDate = today;
                        startDate = today.minusWeeks(1).plusDays(1);
                    }
                }
            } else {
                // fallback mặc định nếu period không truyền
                endDate = today;
                startDate = today.minusWeeks(1).plusDays(1);
            }
        }


        // Validate: nếu FE truyền startDate > endDate
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        // truyền period xuống service để group đúng
        List<TransactionStatsResponse> transactions = statisticsService.getTransactionStatistics(status, provider, startDate, endDate, period);
        return AppApiResponse.<List<TransactionStatsResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.transactions.success", null, locale))
                .result(transactions)
                .build();
    }
}
