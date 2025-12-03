package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TestSubmissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.service.TestService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import com.connectJPA.LinguaVietnameseApp.utils.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tests")
@Tag(name = "Proficiency Tests", description = "APIs for AI-generated proficiency tests")
@RequiredArgsConstructor
@Slf4j
public class TestController {

    private final TestService testService;
    private final MessageSource messageSource;
    private final SecurityUtil securityUtil;
    private final UserLearningActivityService userLearningActivityService;

    @Operation(summary = "Get available test configurations (Paginated)")
    @GetMapping("/available")
    public AppApiResponse<PageResponse<TestConfigResponse>> getAvailableTests(
            @RequestParam String languageCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Locale locale) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<TestConfigResponse> testsPage = testService.getAvailableTests(languageCode, pageable);
        
        PageResponse<TestConfigResponse> pageResponse = new PageResponse<>();
        pageResponse.setContent(testsPage.getContent());
        pageResponse.setPageNumber(testsPage.getNumber());
        pageResponse.setPageSize(testsPage.getSize());
        pageResponse.setTotalElements(testsPage.getTotalElements());
        pageResponse.setTotalPages(testsPage.getTotalPages());
        pageResponse.setIsFirst(testsPage.isLast());
        pageResponse.setIsLast(testsPage.isFirst());
        pageResponse.setHasNext(testsPage.hasNext());
        pageResponse.setHasPrevious(testsPage.hasPrevious());

        return AppApiResponse.<PageResponse<TestConfigResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("test.available.success", null, locale))
                .result(pageResponse)
                .build();
    }
    
    @Operation(summary = "Get test history for user")
    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<List<TestResultResponse>> getTestHistory(Locale locale) {
        UUID userId = securityUtil.getCurrentUserId();
        List<TestResultResponse> history = testService.getTestHistory(userId);
        return AppApiResponse.<List<TestResultResponse>>builder()
                .code(200)
                .message("History retrieved")
                .result(history)
                .build();
    }

    @Operation(summary = "Start a new test session")
    @PostMapping("/start")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<TestSessionResponse> startTest(
            @RequestParam UUID testConfigId,
            @RequestHeader("Authorization") String authorizationHeader,
            Locale locale) {
        UUID userId = securityUtil.getCurrentUserId();
        try {
            String token = authorizationHeader.replace("Bearer ", "");
            TestSessionResponse session = testService.startTest(testConfigId, userId, token);
            return AppApiResponse.<TestSessionResponse>builder()
                    .code(201)
                    .message(messageSource.getMessage("test.session.started", null, locale))
                    .result(session)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<TestSessionResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(e.getErrorCode().getMessage())
                    .build();
        }
    }

    @Operation(summary = "Submit test answers")
    @PostMapping("/sessions/{sessionId}/submit")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<TestResultResponse> submitTest(
            @PathVariable UUID sessionId,
            @RequestBody TestSubmissionRequest submission,
            @RequestParam(defaultValue = "0") int duration,
            Locale locale) {
        UUID userId = securityUtil.getCurrentUserId();
        try {
            TestResultResponse result = testService.submitTest(sessionId, userId, submission);

            // CENTRALIZED LOGGING & CHALLENGE UPDATE
            userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                    .userId(userId)
                    .activityType(ActivityType.TEST)
                    .relatedEntityId(sessionId)
                    .durationInSeconds(duration) // FE sends total duration
                    .details("Test Score: " + result.getScore())
                    .build());

            return AppApiResponse.<TestResultResponse>builder()
                    .code(200)
                    .message("Submitted successfully")
                    .result(result)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<TestResultResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(e.getErrorCode().getMessage())
                    .build();
        }
    }
    
    @Operation(summary = "Poll test result status")
    @GetMapping("/sessions/{sessionId}/result")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<TestResultResponse> getTestResult(
            @PathVariable UUID sessionId,
            Locale locale) {
        UUID userId = securityUtil.getCurrentUserId();
        try {
            TestResultResponse result = testService.getTestResult(sessionId, userId);
            return AppApiResponse.<TestResultResponse>builder()
                    .code(200)
                    .message("Status retrieved")
                    .result(result)
                    .build();
        } catch (AppException e) {
            return AppApiResponse.<TestResultResponse>builder()
                    .code(e.getErrorCode().getStatusCode().value())
                    .message(e.getErrorCode().getMessage())
                    .build();
        }
    }
}