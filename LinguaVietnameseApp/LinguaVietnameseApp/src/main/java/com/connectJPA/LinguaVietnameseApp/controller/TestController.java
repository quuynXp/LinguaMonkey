package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.TestSubmissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestSessionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestConfigResponse; // Bạn cần tạo DTO này
import com.connectJPA.LinguaVietnameseApp.dto.response.TestResultResponse; // Bạn cần tạo DTO này
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.service.TestService; // Bạn cần tạo Service này
import com.connectJPA.LinguaVietnameseApp.utils.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
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

    @Operation(summary = "Get available test configurations", description = "Get all active tests user can take (placement, grammar, vocab, etc.)")
    @GetMapping("/available")
    // (Endpoint này có thể không cần xác thực nếu ai cũng xem được)
    public AppApiResponse<List<TestConfigResponse>> getAvailableTests(
            @RequestParam String languageCode,
            Locale locale) {

        List<TestConfigResponse> tests = testService.getAvailableTests(languageCode);
        return AppApiResponse.<List<TestConfigResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("test.available.success", null, locale))
                .result(tests)
                .build();
    }

    @Operation(summary = "Start a new test session", description = "Calls AI to generate questions and creates a test session")
    @PostMapping("/start")
    @PreAuthorize("isAuthenticated()") // Đảm bảo endpoint này yêu cầu xác thực
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
        } catch (java.util.concurrent.CompletionException e) { // <-- THÊM KHỐI NÀY
            if (e.getCause() instanceof AppException appEx) {
                return AppApiResponse.<TestSessionResponse>builder()
                        .code(appEx.getErrorCode().getStatusCode().value())
                        .message(appEx.getErrorCode().getMessage())
                        .build();
            } else {
                log.error("Unhandled completion exception: {}", e.getMessage(), e);
                return AppApiResponse.<TestSessionResponse>builder()
                        .code(500)
                        .message("Unexpected error during test generation: " + e.getMessage())
                        .build();
            }
        }
    }

    @Operation(summary = "Submit test answers", description = "Submits user answers, grades the test, and returns the result")
    @PostMapping("/sessions/{sessionId}/submit")
    @PreAuthorize("isAuthenticated()") // Đảm bảo endpoint này yêu cầu xác thực
    public AppApiResponse<TestResultResponse> submitTest(
            @PathVariable UUID sessionId,
            // @Parameter(description = "User ID (lấy từ security context hoặc token)") @RequestParam UUID userId, // <-- BỎ ĐI
            @RequestBody TestSubmissionRequest submission,
            Locale locale) {

        // === SỬA ĐỔI: Lấy userId từ SecurityUtil ===
        UUID userId = securityUtil.getCurrentUserId();

        try {
            TestResultResponse result = testService.submitTest(sessionId, userId, submission);

            return AppApiResponse.<TestResultResponse>builder()
                    .code(200)
                    .message(messageSource.getMessage("test.session.submitted", null, locale))
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