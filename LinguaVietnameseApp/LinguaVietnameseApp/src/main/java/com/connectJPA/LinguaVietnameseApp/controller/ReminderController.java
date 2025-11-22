package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserReminderRequest; // Cần tạo DTO này nếu chưa có
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserReminderResponse; // Cần tạo DTO này nếu chưa có
import com.connectJPA.LinguaVietnameseApp.service.UserReminderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final UserReminderService userReminderService;
    private final MessageSource messageSource;

    @Operation(summary = "Create a new reminder", description = "Create a custom reminder for the user")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<UserReminderResponse> createReminder(
            @Valid @RequestBody UserReminderRequest request,
            Principal principal,
            Locale locale) {
        UUID userId = UUID.fromString(principal.getName());
        UserReminderResponse response = userReminderService.createReminder(userId, request);
        return AppApiResponse.<UserReminderResponse>builder()
                .code(201)
                .message(messageSource.getMessage("reminder.create.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Get reminder by ID", description = "Get details of a specific reminder")
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<UserReminderResponse> getReminderById(
            @PathVariable UUID id,
            Principal principal,
            Locale locale) {
        UUID userId = UUID.fromString(principal.getName());
        UserReminderResponse response = userReminderService.getReminderById(id, userId);
        return AppApiResponse.<UserReminderResponse>builder()
                .code(200)
                .message(messageSource.getMessage("reminder.get.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Get user reminders", description = "Get all reminders for the current user")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<Page<UserReminderResponse>> getReminders(
            @RequestParam(required = false) Boolean enabled,
            Pageable pageable,
            Principal principal,
            Locale locale) {
        UUID userId = UUID.fromString(principal.getName());
        Page<UserReminderResponse> reminders = userReminderService.getUserReminders(userId, enabled, pageable);
        return AppApiResponse.<Page<UserReminderResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("reminder.list.success", null, locale))
                .result(reminders)
                .build();
    }

    @Operation(summary = "Update a reminder", description = "Update details of an existing reminder")
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<UserReminderResponse> updateReminder(
            @PathVariable UUID id,
            @Valid @RequestBody UserReminderRequest request,
            Principal principal,
            Locale locale) {
        UUID userId = UUID.fromString(principal.getName());
        UserReminderResponse response = userReminderService.updateReminder(id, userId, request);
        return AppApiResponse.<UserReminderResponse>builder()
                .code(200)
                .message(messageSource.getMessage("reminder.update.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Toggle reminder status", description = "Enable or disable a reminder")
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<UserReminderResponse> toggleReminder(
            @PathVariable UUID id,
            Principal principal,
            Locale locale) {
        UUID userId = UUID.fromString(principal.getName());
        UserReminderResponse response = userReminderService.toggleReminder(id, userId);
        return AppApiResponse.<UserReminderResponse>builder()
                .code(200)
                .message(messageSource.getMessage("reminder.toggle.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Delete a reminder", description = "Soft delete a reminder")
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<Void> deleteReminder(
            @PathVariable UUID id,
            Principal principal,
            Locale locale) {
        UUID userId = UUID.fromString(principal.getName());
        userReminderService.deleteReminder(id, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("reminder.delete.success", null, locale))
                .build();
    }
}