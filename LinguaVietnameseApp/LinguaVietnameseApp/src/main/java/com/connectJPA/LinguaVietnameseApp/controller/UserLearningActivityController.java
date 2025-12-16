package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserLearningActivityRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.service.LessonService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import com.connectJPA.LinguaVietnameseApp.service.impl.UserLearningActivityServiceImpl;
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
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-learning-activities")
@Tag(name = "User Learning Activity Management", description = "APIs for managing user learning activities")
@RequiredArgsConstructor
public class UserLearningActivityController {
    private final UserLearningActivityService userLearningActivityService;
    private final MessageSource messageSource;
    private final LessonService lessonService;

    @Operation(summary = "Get all user learning activities", description = "Retrieve a paginated list of user learning activities with optional filtering by userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user learning activities"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
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

    @Operation(summary = "Record User Heartbeat", description = "Call this every minute to track user online time. Updates Redis counters.")
    @PostMapping("/heartbeat")
    public AppApiResponse<Void> recordHeartbeat(@RequestParam UUID userId) {
        // SỬA LỖI 2: Gọi qua interface sau khi đã thêm phương thức vào UserLearningActivityService
        userLearningActivityService.recordHeartbeat(userId); 
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Heartbeat recorded")
                .build();
    }

    @Operation(summary = "Get aggregated study history", description = "Retrieve a user's study history aggregated by sessions and stats for a given period.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved study history"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/history")
    public AppApiResponse<StudyHistoryResponse> getStudyHistory(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Time filter period (week, month, year)") @RequestParam(defaultValue = "month") String period,
            Locale locale) {

        StudyHistoryResponse history = userLearningActivityService.getAggregatedStudyHistory(userId, period);

        if (history == null) {
            history = StudyHistoryResponse.builder()
                    .sessions(Collections.emptyList())
                    .stats(StatsResponse.builder()
                            .totalSessions(0L) // stats.totalSessions là long, không phải int
                            // SỬA LỖI 1: Đổi totalTime thành totalTimeSeconds
                            .totalTimeSeconds(0L) 
                            .totalExperience(0)
                            .averageScore(0.0)
                            // Thêm các trường mới để tránh lỗi JSON/Frontend
                            .totalCoins(0)
                            .lessonsCompleted(0)
                            .timeGrowthPercent(0.0)
                            .accuracyGrowthPercent(0.0)
                            .coinsGrowthPercent(0.0)
                            .weakestSkill("NONE")
                            .improvementSuggestion("")
                            .timeChartData(Collections.emptyList())
                            .accuracyChartData(Collections.emptyList())
                            .build())
                    .build();
        }
        
        // KIỂM TRA LẠI: Lỗi có thể do totalSessions là int, ta nên dùng 0L cho an toàn hoặc kiểm tra lại DTO
        // Nếu DTO là int, thì dùng 0.
        // Dựa trên DTO cũ, totalSessions là long. Ta dùng 0L.

        return AppApiResponse.<StudyHistoryResponse>builder()
                .code(200)
                .message(messageSource.getMessage("userLearningActivity.history.success", null, locale))
                .result(history)
                .build();
    }

    @Operation(summary = "Get user learning activity by ID", description = "Retrieve a user learning activity by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user learning activity"),
            @ApiResponse(responseCode = "404", description = "User learning activity not found")
    })
    @GetMapping("/{id}")
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

    @Operation(summary = "Log the start of a learning activity", description = "Call this when a user starts an activity (e.g., opens a lesson or chat)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Activity start logged successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid data")
    })
    @PostMapping("/start")
    public AppApiResponse<UserLearningActivityResponse> logActivityStart(
            @Valid @RequestBody LearningActivityEventRequest request,
            Locale locale) {

        LessonResponse lesson = lessonService.getLessonById(request.getRelatedEntityId());

        if (request.getActivityType() != ActivityType.LESSON_START &&
                request.getActivityType() != ActivityType.CHAT_START) {
            throw new IllegalArgumentException("ActivityType must be a START event (e.g., LESSON_START, CHAT_START)");
        }

        UserLearningActivityResponse activity = userLearningActivityService.logUserActivity(
                request.getUserId(),
                request.getActivityType(),
                request.getRelatedEntityId(),
                null,
                lesson.getExpReward(), request.getDetails(),
                lesson.getSkillTypes());

        return AppApiResponse.<UserLearningActivityResponse>builder()
                .code(201)
                .message(messageSource.getMessage("userLearningActivity.start.success", null, locale))
                .result(activity)
                .build();
    }

    @Operation(summary = "Log an activity END event and check daily challenges")
    @PostMapping("/end")
    public AppApiResponse<ActivityCompletionResponse> logActivityEnd(@RequestBody LearningActivityEventRequest request) {
        ActivityCompletionResponse response = userLearningActivityService.logActivityEndAndCheckChallenges(request);
        
        return AppApiResponse.<ActivityCompletionResponse>builder()
                .code(200)
                .message("Activity logged and challenges checked successfully")
                .result(response)
                .build();
    }

    @Operation(summary = "Create a new user learning activity", description = "Create a new user learning activity with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User learning activity created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user learning activity data")
    })
    @PostMapping
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