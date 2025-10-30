package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.NotificationResponse;
import com.connectJPA.LinguaVietnameseApp.service.EmailService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
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
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all notifications", description = "Retrieve a paginated list of notifications with optional filtering by userId, title, or type")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved notifications"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<NotificationResponse>> getAllNotifications(
            @Parameter(description = "User ID filter") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Title filter") @RequestParam(required = false) String title,
            @Parameter(description = "Type filter") @RequestParam(required = false) String type,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<NotificationResponse> notifications = notificationService.getAllNotifications(userId, title, type, pageable);
        return AppApiResponse.<Page<NotificationResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("notification.list.success", null, locale))
                .result(notifications)
                .build();
    }

    @Operation(summary = "Get notifications by user ID", description = "Retrieve a paginated list of notifications for a specific user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved notifications"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @GetMapping("/{userId}")
    public AppApiResponse<Page<NotificationResponse>> getAllNotificationByUserId(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<NotificationResponse> notifications = notificationService.getAllNotificationByUserId(userId, pageable);
        return AppApiResponse.<Page<NotificationResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("notification.list.success", null, locale))
                .result(notifications)
                .build();
    }

    @Operation(summary = "Get notification by ID", description = "Retrieve a notification by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved notification"),
            @ApiResponse(responseCode = "404", description = "Notification not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @GetMapping("/detail/{id}")
    public AppApiResponse<NotificationResponse> getNotificationById(
            @Parameter(description = "Notification ID") @PathVariable UUID id,
            Locale locale) {
        NotificationResponse notification = notificationService.getNotificationById(id);
        return AppApiResponse.<NotificationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("notification.get.success", null, locale))
                .result(notification)
                .build();
    }

    @Operation(summary = "Create a new notification", description = "Create a new notification with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Notification created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid notification data"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping
    public AppApiResponse<NotificationResponse> createNotification(
            @Valid @RequestBody NotificationRequest request,
            Locale locale) {
        NotificationResponse notification = notificationService.createNotification(request);
        return AppApiResponse.<NotificationResponse>builder()
                .code(201)
                .message(messageSource.getMessage("notification.created.success", null, locale))
                .result(notification)
                .build();
    }

    @Operation(summary = "Update a notification", description = "Update an existing notification by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Notification updated successfully"),
            @ApiResponse(responseCode = "404", description = "Notification not found"),
            @ApiResponse(responseCode = "400", description = "Invalid notification data"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PutMapping("/{id}")
    public AppApiResponse<NotificationResponse> updateNotification(
            @Parameter(description = "Notification ID") @PathVariable UUID id,
            @Valid @RequestBody NotificationRequest request,
            Locale locale) {
        NotificationResponse notification = notificationService.updateNotification(id, request);
        return AppApiResponse.<NotificationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("notification.updated.success", null, locale))
                .result(notification)
                .build();
    }

    @Operation(summary = "Delete a notification", description = "Soft delete a notification by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Notification deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Notification not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteNotification(
            @Parameter(description = "Notification ID") @PathVariable UUID id,
            Locale locale) {
        notificationService.deleteNotification(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("notification.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Send course purchase email", description = "Send an email and create a notification for a course purchase")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID or course name"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/purchase-course")
    public AppApiResponse<Void> sendPurchaseCourseEmail(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Course name") @RequestParam String courseName,
            Locale locale) {
        notificationService.sendPurchaseCourseNotification(userId, courseName);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.course.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send voucher registration email", description = "Send an email and create a notification for voucher registration")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID or voucher code"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/voucher-registration")
    public AppApiResponse<Void> sendVoucherRegistrationEmail(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Voucher code") @RequestParam String voucherCode,
            Locale locale) {
        notificationService.sendVoucherRegistrationNotification(userId, voucherCode);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.voucher.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send achievement email", description = "Send an email and create a notification for an achievement")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID, title, or message"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/achievement")
    public AppApiResponse<Void> sendAchievementEmail(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Achievement title") @RequestParam String title,
            @Parameter(description = "Achievement message") @RequestParam String message,
            Locale locale) {
        notificationService.sendAchievementNotification(userId, title, message);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.achievement.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send daily study reminder email", description = "Send a daily study reminder email and create a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/daily-reminder")
    public AppApiResponse<Void> sendDailyStudyReminder(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            Locale locale) {
        notificationService.sendDailyStudyReminderNotification(userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.daily_reminder.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send password reset email", description = "Send a password reset email and create a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID or reset link"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/password-reset")
    public AppApiResponse<Void> sendPasswordResetEmail(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Reset link") @RequestParam String resetLink,
            Locale locale) {
        notificationService.sendPasswordResetNotification(userId, resetLink);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.reset.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send account verification email", description = "Send an account verification email and create a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID or verify link"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/verify-account")
    public AppApiResponse<Void> sendVerifyAccountEmail(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Verify link") @RequestParam String verifyLink,
            Locale locale) {
        notificationService.sendVerifyAccountNotification(userId, verifyLink);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.verify.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send inactivity warning email", description = "Send an inactivity warning email and create a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID or days"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/inactivity-warning")
    public AppApiResponse<Void> sendInactivityWarning(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Number of inactive days") @RequestParam int days,
            Locale locale) {
        notificationService.sendInactivityWarningNotification(userId, days);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.inactivity.sent.success", null, locale))
                .build();
    }

    @Operation(summary = "Send streak reward email", description = "Send a streak reward email and create a notification")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email and notification sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID or streak days"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping("/email/streak-reward")
    public AppApiResponse<Void> sendStreakRewardEmail(
            @Parameter(description = "User ID") @RequestParam UUID userId,
            @Parameter(description = "Number of streak days") @RequestParam int streakDays,
            Locale locale) {
        notificationService.sendStreakRewardNotification(userId, streakDays);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("email.streak.sent.success", null, locale))
                .build();
    }
}