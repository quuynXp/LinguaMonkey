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
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    private final StatisticsService statisticsService;
    private final MessageSource messageSource;


    @Operation(summary = "Get comprehensive dashboard statistics for a user", description = "Retrieve all statistics needed for the user's main dashboard (charts, progress, etc.)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved dashboard statistics"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Invalid date range")
    })
    @GetMapping("/user/{userId}/dashboard")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #userId.toString() == authentication.name")
    public AppApiResponse<DashboardStatisticsResponse> getDashboardStatistics(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Period shortcut (optional): day, week, month, year") @RequestParam(required = false) String period,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Locale locale) {

        LocalDate today = LocalDate.now();
        if (startDate == null || endDate == null) {
            if (period != null) {
                switch (period.toLowerCase()) {
                    case "day" -> { startDate = today; endDate = today; }
                    case "month" -> { endDate = today; startDate = today.minusMonths(1).plusDays(1); }
                    case "year" -> { endDate = today; startDate = today.minusYears(1).plusDays(1); }
                    default -> { endDate = today; startDate = today.minusWeeks(1).plusDays(1); }
                }
            } else {
                endDate = today;
                startDate = today.minusDays(29);
            }
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        DashboardStatisticsResponse dashboardData = statisticsService.getDashboardStatistics(userId, startDate, endDate);

        return AppApiResponse.<DashboardStatisticsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.dashboard.success", null, locale))
                .result(dashboardData)
                .build();
    }

    @Operation(summary = "Get study history with stats for Progress screen", 
            description = "Returns sessions list + stats aggregated by period (day/week/month/year)")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successfully retrieved study history"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/user/{userId}/study-history")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #userId.toString() == authentication.name")
    public AppApiResponse<StudyHistoryResponse> getStudyHistory(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Period: day, week, month, year") @RequestParam(defaultValue = "week") String period,
            Locale locale) {
        
        LocalDate today = LocalDate.now();
        LocalDate startDate;
        LocalDate endDate = today;
        
        switch (period.toLowerCase()) {
            case "day" -> {
                startDate = today;
                endDate = today;
            }
            case "month" -> {
                startDate = today.minusMonths(1).plusDays(1);
            }
            case "year" -> {
                startDate = today.minusYears(1).plusDays(1);
            }
            default -> { // week
                startDate = today.minusWeeks(1).plusDays(1);
            }
        }
        
        StudyHistoryResponse history = statisticsService.getStudyHistory(userId, startDate, endDate, period);
        
        return AppApiResponse.<StudyHistoryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.study.history.success", null, locale))
                .result(history)
                .build();
    }

    @GetMapping("/overview")
    public AppApiResponse<StatisticsOverviewResponse> overview(
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String endDate,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate
    ) {
        LocalDate today = LocalDate.now();
        LocalDate localStartDate = null;
        LocalDate localEndDate = null;

        try {
            if (startDate != null && endDate != null) {
                localStartDate = LocalDate.parse(startDate);
                localEndDate = LocalDate.parse(endDate);
            } else {
                if (period != null) {
                    switch (period.toLowerCase()) {
                        case "day" -> {
                            localStartDate = today;
                            localEndDate = today;
                        }
                        case "month" -> {
                            localEndDate = today;
                            localStartDate = today.minusMonths(1).plusDays(1);
                        }
                        case "year" -> {
                            localEndDate = today;
                            localStartDate = today.minusYears(1).plusDays(1);
                        }
                        default -> {
                            localEndDate = today;
                            localStartDate = today.minusWeeks(1).plusDays(1);
                        }
                    }
                } else {
                    localEndDate = today;
                    localStartDate = today.minusWeeks(1).plusDays(1);
                }
            }
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date format. Use yyyy-MM-dd");
        }

        if (localStartDate.isAfter(localEndDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        StatisticsOverviewResponse resp = statisticsService.getOverview(userId, localStartDate, localEndDate, aggregate);

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
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #userId.toString() == authentication.name")
    public AppApiResponse<StatisticsResponse> getUserStatistics(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @RequestParam(required = false) String period,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate,
            Locale locale) {

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
                endDate = today;
                startDate = today.minusWeeks(1).plusDays(1);
            }
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        StatisticsResponse statistics = statisticsService.getUserStatistics(userId, startDate, endDate, aggregate);

        return AppApiResponse.<StatisticsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.get.success", null, locale))
                .result(statistics)
                .build();
    }

    @Operation(summary = "Get user count statistics", description = "Retrieve user counts by period (day, month, year) with optional filters")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user counts"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
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
    @GetMapping("/activities")
    public AppApiResponse<List<ActivityCountResponse>> getActivityStatistics(
            @Parameter(description = "Activity type (optional)") @RequestParam(required = false) String activityType,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Period shortcut (optional): day, week, month, year") @RequestParam(required = false) String period,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate,
            Locale locale) {

        if (period != null && (startDate == null || endDate == null)) {
            LocalDate today = LocalDate.now();
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
                    endDate = today;
                    startDate = today.minusWeeks(1).plusDays(1);
                }
            }
        }

        if (startDate == null) startDate = LocalDate.now().minusWeeks(1).plusDays(1);
        if (endDate == null) endDate = LocalDate.now();
        String usedPeriod = (aggregate != null ? aggregate : period);
        if (usedPeriod == null) usedPeriod = "day";

        List<ActivityCountResponse> activities = statisticsService.getActivityStatistics(activityType, startDate, endDate, usedPeriod);
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
    @GetMapping("/transactions")
    public AppApiResponse<List<TransactionStatsResponse>> getTransactionStatistics(
            @Parameter(description = "Status (optional)") @RequestParam(required = false) String status,
            @Parameter(description = "Period shortcut (optional): day, week, month, year") @RequestParam(required = false) String period,
            @Parameter(description = "Provider (optional)") @RequestParam(required = false) String provider,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate,
            Locale locale) {


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
                        endDate = today;
                        startDate = today.minusWeeks(1).plusDays(1);
                    }
                }
            } else {
                endDate = today;
                startDate = today.minusWeeks(1).plusDays(1);
            }
        }


        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }
        String usedPeriod = (aggregate != null ? aggregate : period);
        if (usedPeriod == null) usedPeriod = "day";

        List<TransactionStatsResponse> transactions = statisticsService.getTransactionStatistics(status, provider, startDate, endDate, usedPeriod);
        return AppApiResponse.<List<TransactionStatsResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.transactions.success", null, locale))
                .result(transactions)
                .build();
    }

    @GetMapping("/teacher/overview")
    public AppApiResponse<TeacherOverviewResponse> teacherOverview(
            @RequestParam(value = "teacherId", required = false) UUID teacherId,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String startDateStr,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String endDateStr,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate
    ) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = null;
        LocalDate endDate = null;

        try {
            if (startDateStr != null && endDateStr != null) {
                startDate = LocalDate.parse(startDateStr);
                endDate = LocalDate.parse(endDateStr);
            } else if (period != null) {
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
                endDate = today;
                startDate = today.minusWeeks(1).plusDays(1);
            }
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date format. Use yyyy-MM-dd");
        }

        if (startDate.isAfter(endDate)) throw new IllegalArgumentException("startDate cannot be after endDate");

        TeacherOverviewResponse resp = statisticsService.getTeacherOverview(teacherId, startDate, endDate, aggregate);
        Locale locale = LocaleContextHolder.getLocale();
        String msg = messageSource.getMessage("statistics.get.success", null, "OK", locale);

        return AppApiResponse.<TeacherOverviewResponse>builder().code(200).message(msg).result(resp).build();
    }

    /**
     * Performance across teacher's courses (one entry per course)
     */
    @GetMapping("/teacher/courses/performance")
    public AppApiResponse<List<CoursePerformanceResponse>> teacherCoursesPerformance(
            @RequestParam(value = "teacherId", required = false) UUID teacherId,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String startDateStr,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String endDateStr,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "aggregate", required = false, defaultValue = "week") String aggregate
    ) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = null;
        LocalDate endDate = null;
        try {
            if (startDateStr != null && endDateStr != null) {
                startDate = LocalDate.parse(startDateStr);
                endDate = LocalDate.parse(endDateStr);
            } else if (period != null) {
                switch (period.toLowerCase()) {
                    case "day" -> { startDate = today; endDate = today; }
                    case "month" -> { endDate = today; startDate = today.minusMonths(1).plusDays(1); }
                    case "year" -> { endDate = today; startDate = today.minusYears(1).plusDays(1); }
                    default -> { endDate = today; startDate = today.minusMonths(1).plusDays(1); }
                }
            } else {
                endDate = today;
                startDate = today.minusMonths(1).plusDays(1);
            }
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date format. Use yyyy-MM-dd");
        }

        if (startDate.isAfter(endDate)) throw new IllegalArgumentException("startDate cannot be after endDate");

        List<CoursePerformanceResponse> out = statisticsService.getTeacherCoursesPerformance(teacherId, startDate, endDate, aggregate);

        return AppApiResponse.<List<CoursePerformanceResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.get.success", null, LocaleContextHolder.getLocale()))
                .result(out)
                .build();
    }

    /**
     * Lesson stats for a specific course (teacher must be owner)
     */
    @GetMapping("/teacher/courses/{courseId}/lessons")
    public AppApiResponse<List<LessonStatsResponse>> teacherCourseLessons(
            @PathVariable UUID courseId,
            @RequestParam(value = "teacherId", required = false) UUID teacherId,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate today = LocalDate.now();
        if (startDate == null || endDate == null) {
            endDate = today;
            startDate = today.minusDays(29);
        }
        if (startDate.isAfter(endDate)) throw new IllegalArgumentException("startDate cannot be after endDate");

        List<LessonStatsResponse> out = statisticsService.getTeacherCourseLessonStats(teacherId, courseId, startDate, endDate);
        return AppApiResponse.<List<LessonStatsResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.get.success", null, LocaleContextHolder.getLocale()))
                .result(out)
                .build();
    }

    /**
     * Revenue timeseries for a specific course (teacher must be owner)
     */
    @GetMapping("/teacher/courses/{courseId}/revenue")
    public AppApiResponse<List<com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint>> teacherCourseRevenue(
            @PathVariable UUID courseId,
            @RequestParam(value = "teacherId", required = false) UUID teacherId,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate
    ) {
        LocalDate today = LocalDate.now();
        if (startDate == null || endDate == null) {
            endDate = today;
            startDate = today.minusMonths(1).plusDays(1);
        }
        if (startDate.isAfter(endDate)) throw new IllegalArgumentException("startDate cannot be after endDate");

        List<com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint> ts = statisticsService.getTeacherCourseRevenue(teacherId, courseId, startDate, endDate, aggregate);
        return AppApiResponse.<List<com.connectJPA.LinguaVietnameseApp.dto.TimeSeriesPoint>>builder()
                .code(200)
                .message(messageSource.getMessage("statistics.get.success", null, LocaleContextHolder.getLocale()))
                .result(ts)
                .build();
    }

    @Operation(summary = "Get Deposit Revenue statistics", description = "Retrieve total revenue and time series for DEPOSIT transactions")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved deposit revenue statistics"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    @GetMapping("/deposit-revenue")
    public AppApiResponse<DepositRevenueResponse> getDepositRevenueStatistics(
            @Parameter(description = "Period shortcut (optional): day, week, month, year") @RequestParam(required = false) String period,
            @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String startDate,
            @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String endDate,
            @RequestParam(value = "aggregate", required = false, defaultValue = "day") String aggregate,
            Locale locale
    ) {
        LocalDate today = LocalDate.now();
        LocalDate localStartDate = null;
        LocalDate localEndDate = null;

        try {
            if (startDate != null && endDate != null) {
                localStartDate = LocalDate.parse(startDate);
                localEndDate = LocalDate.parse(endDate);
            } else {
                if (period != null) {
                    switch (period.toLowerCase()) {
                        case "day" -> {
                            localStartDate = today;
                            localEndDate = today;
                        }
                        case "week" -> {
                            localEndDate = today;
                            localStartDate = today.minusWeeks(1).plusDays(1);
                        }
                        case "month" -> {
                            localEndDate = today;
                            localStartDate = today.minusMonths(1).plusDays(1);
                        }
                        case "year" -> {
                            localEndDate = today;
                            localStartDate = today.minusYears(1).plusDays(1);
                        }
                        default -> {
                            localEndDate = today;
                            localStartDate = today.minusWeeks(1).plusDays(1);
                        }
                    }
                } else {
                    localEndDate = today;
                    localStartDate = today.minusWeeks(1).plusDays(1);
                }
            }
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date format. Use yyyy-MM-dd");
        }

        if (localStartDate.isAfter(localEndDate)) {
            throw new IllegalArgumentException("startDate cannot be after endDate");
        }

        DepositRevenueResponse resp = statisticsService.getDepositRevenueStatistics(localStartDate, localEndDate, aggregate);

        String msg = messageSource.getMessage("statistics.get.success", null, "OK", locale);

        return AppApiResponse.<DepositRevenueResponse>builder()
                .code(200)
                .message(msg)
                .result(resp)
                .build();
    }
}