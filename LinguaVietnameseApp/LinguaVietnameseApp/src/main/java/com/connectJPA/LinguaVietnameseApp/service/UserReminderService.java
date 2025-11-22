package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserReminderRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserReminderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface UserReminderService {
    UserReminderResponse createReminder(UUID userId, UserReminderRequest request);
    UserReminderResponse updateReminder(UUID id, UUID userId, UserReminderRequest request);
    void deleteReminder(UUID id, UUID userId);
    UserReminderResponse toggleReminder(UUID id, UUID userId);

    @Transactional(readOnly = true)
    UserReminderResponse getReminderById(UUID id, UUID userId);

    Page<UserReminderResponse> getUserReminders(UUID userId, Boolean enabled, Pageable pageable);
}