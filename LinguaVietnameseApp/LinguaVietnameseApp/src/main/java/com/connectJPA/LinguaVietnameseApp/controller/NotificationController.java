package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.NotificationResponse;
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
    @GetMapping
    public AppApiResponse<Page<NotificationResponse>> getAllNotifications(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String type,
            Pageable pageable,
            Locale locale) {
        Page<NotificationResponse> notifications = notificationService.getAllNotifications(userId, title, type, pageable);
        return AppApiResponse.<Page<NotificationResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("notification.list.success", null, locale))
                .result(notifications)
                .build();
    }

    @Operation(summary = "Get notifications by user ID", description = "Retrieve a paginated list of notifications for a specific user")
    @GetMapping("/{userId}")
    public AppApiResponse<Page<NotificationResponse>> getAllNotificationByUserId(
            @PathVariable UUID userId,
            Pageable pageable,
            Locale locale) {
        Page<NotificationResponse> notifications = notificationService.getAllNotificationByUserId(userId, pageable);
        return AppApiResponse.<Page<NotificationResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("notification.list.success", null, locale))
                .result(notifications)
                .build();
    }

    @Operation(summary = "Mark single notification as read")
    @PatchMapping("/{id}/read")
    public AppApiResponse<Void> markAsRead(@PathVariable UUID id, Locale locale) {
        notificationService.markAsRead(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("notification.read.success", null, locale))
                .build();
    }

    @Operation(summary = "Get unread count", description = "Get count of unread notifications for a user")
    @GetMapping("/{userId}/unread-count")
    public AppApiResponse<Long> getUnreadCount(@PathVariable UUID userId, Locale locale) {
        long count = notificationService.countUnreadNotifications(userId);
        return AppApiResponse.<Long>builder()
                .code(200)
                .message(messageSource.getMessage("notification.count.success", null, locale))
                .result(count)
                .build();
    }

    @Operation(summary = "Mark all as read", description = "Mark all notifications as read for a user")
    @PutMapping("/{userId}/mark-all-read")
    public AppApiResponse<Void> markAllAsRead(@PathVariable UUID userId, Locale locale) {
        notificationService.markAllAsRead(userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("notification.read.success", null, locale))
                .build();
    }

    @Operation(summary = "Delete all notifications", description = "Soft delete all notifications for a user")
    @DeleteMapping("/{userId}/delete-all")
    public AppApiResponse<Void> deleteAllNotifications(@PathVariable UUID userId, Locale locale) {
        notificationService.deleteAllNotifications(userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("notification.deleted_all.success", null, locale))
                .build();
    }

    @Operation(summary = "Get notification by ID", description = "Retrieve a notification by its ID")
    @GetMapping("/detail/{id}")
    public AppApiResponse<NotificationResponse> getNotificationById(
            @PathVariable UUID id,
            Locale locale) {
        NotificationResponse notification = notificationService.getNotificationById(id);
        return AppApiResponse.<NotificationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("notification.get.success", null, locale))
                .result(notification)
                .build();
    }

    @Operation(summary = "Create a new notification")
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

    @Operation(summary = "Update a notification")
    @PutMapping("/{id}")
    public AppApiResponse<NotificationResponse> updateNotification(
            @PathVariable UUID id,
            @Valid @RequestBody NotificationRequest request,
            Locale locale) {
        NotificationResponse notification = notificationService.updateNotification(id, request);
        return AppApiResponse.<NotificationResponse>builder()
                .code(200)
                .message(messageSource.getMessage("notification.updated.success", null, locale))
                .result(notification)
                .build();
    }

    @Operation(summary = "Delete a notification")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteNotification(
            @PathVariable UUID id,
            Locale locale) {
        notificationService.deleteNotification(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("notification.deleted.success", null, locale))
                .build();
    }

    // --- EMAIL TRIGGER ENDPOINTS ---

    @PostMapping("/email/purchase-course")
    public AppApiResponse<Void> sendPurchaseCourseEmail(
            @RequestParam UUID userId,
            @RequestParam String courseName,
            Locale locale) {
        notificationService.sendPurchaseCourseNotification(userId, courseName);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/voucher-registration")
    public AppApiResponse<Void> sendVoucherRegistrationEmail(
            @RequestParam UUID userId,
            @RequestParam String voucherCode,
            Locale locale) {
        notificationService.sendVoucherRegistrationNotification(userId, voucherCode);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/achievement")
    public AppApiResponse<Void> sendAchievementEmail(
            @RequestParam UUID userId,
            @RequestParam String title,
            @RequestParam String message,
            Locale locale) {
        notificationService.sendAchievementNotification(userId, title, message);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/daily-reminder")
    public AppApiResponse<Void> sendDailyStudyReminder(@RequestParam UUID userId, Locale locale) {
        notificationService.sendDailyStudyReminderNotification(userId);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/password-reset")
    public AppApiResponse<Void> sendPasswordResetEmail(
            @RequestParam UUID userId,
            @RequestParam String resetLink,
            Locale locale) {
        notificationService.sendPasswordResetNotification(userId, resetLink);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/verify-account")
    public AppApiResponse<Void> sendVerifyAccountEmail(
            @RequestParam UUID userId,
            @RequestParam String verifyLink,
            Locale locale) {
        notificationService.sendVerifyAccountNotification(userId, verifyLink);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/inactivity-warning")
    public AppApiResponse<Void> sendInactivityWarning(
            @RequestParam UUID userId,
            @RequestParam int days,
            Locale locale) {
        notificationService.sendInactivityWarningNotification(userId, days);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }

    @PostMapping("/email/streak-reward")
    public AppApiResponse<Void> sendStreakRewardEmail(
            @RequestParam UUID userId,
            @RequestParam int streakDays,
            Locale locale) {
        notificationService.sendStreakRewardNotification(userId, streakDays);
        return AppApiResponse.<Void>builder().code(200).message("Email sent").build();
    }
}