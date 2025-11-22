package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserReminderRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserReminderResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserReminderRepository;
import com.connectJPA.LinguaVietnameseApp.service.UserReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserReminderServiceImpl implements UserReminderService {

    private final UserReminderRepository userReminderRepository;
    private final ZoneOffset APP_ZONE_OFFSET = ZoneOffset.ofHours(7); // Giả định múi giờ hệ thống là UTC+7

    @Override
    @Transactional
    public UserReminderResponse createReminder(UUID userId, UserReminderRequest request) {
        UserReminder newReminder = UserReminder.builder()
                .userId(userId)
                .isDeleted(false)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();

        mapRequestToEntity(request, newReminder);
        newReminder.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        UserReminder savedReminder = userReminderRepository.save(newReminder);
        return mapEntityToResponse(savedReminder);
    }

    @Override
    @Transactional
    public UserReminderResponse updateReminder(UUID id, UUID userId, UserReminderRequest request) {
        UserReminder reminder = userReminderRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found with id " + id));

        mapRequestToEntity(request, reminder);
        reminder.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        UserReminder updatedReminder = userReminderRepository.save(reminder);
        return mapEntityToResponse(updatedReminder);
    }

    @Override
    @Transactional
    public void deleteReminder(UUID id, UUID userId) {
        UserReminder reminder = userReminderRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found with id " + id));

        reminder.setDeleted(true);
        reminder.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userReminderRepository.save(reminder);
    }

    @Override
    @Transactional
    public UserReminderResponse toggleReminder(UUID id, UUID userId) {
        UserReminder reminder = userReminderRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found with id " + id));

        reminder.setEnabled(!reminder.getEnabled());
        reminder.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        UserReminder toggledReminder = userReminderRepository.save(reminder);
        return mapEntityToResponse(toggledReminder);
    }

    @Transactional(readOnly = true)
    @Override
    public UserReminderResponse getReminderById(UUID id, UUID userId) {
        UserReminder reminder = userReminderRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found with id " + id));
        return mapEntityToResponse(reminder);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserReminderResponse> getUserReminders(UUID userId, Boolean enabled, Pageable pageable) {
        Page<UserReminder> remindersPage;
        if (enabled != null) {
            remindersPage = userReminderRepository.findByUserIdAndEnabledAndIsDeletedFalse(userId, enabled, pageable);
        } else {
            remindersPage = userReminderRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
        }
        return remindersPage.map(this::mapEntityToResponse);
    }

    private void mapRequestToEntity(UserReminderRequest request, UserReminder entity) {
        // 1. Map đơn giản
        entity.setTitle(request.getTitle());
        entity.setMessage(request.getMessage());
        entity.setEnabled(request.getEnabled() != null ? request.getEnabled() : true);

        // 2. Map TargetType và RepeatType (Enum)
        entity.setTargetType(request.getTargetType());
        entity.setRepeatType(request.getRepeatType());

        // 3. Map TargetId (String -> UUID)
        if (request.getTargetId() != null && !request.getTargetId().isEmpty()) {
            entity.setTargetId(UUID.fromString(request.getTargetId()));
        } else {
            entity.setTargetId(null);
        }

        // 4. Map Thời gian (String -> OffsetDateTime)
        // Lấy giờ phút từ request.getTime()
        LocalTime reminderTime = LocalTime.parse(request.getTime(), DateTimeFormatter.ofPattern("HH:mm"));

        // Lấy ngày
        LocalDate reminderDate = (request.getDate() != null && !request.getDate().isEmpty())
                ? LocalDate.parse(request.getDate(), DateTimeFormatter.ISO_LOCAL_DATE)
                : LocalDate.now(APP_ZONE_OFFSET); // Nếu không có ngày, mặc định là ngày hiện tại

        // Kết hợp thành LocalDateTime
        LocalDateTime reminderDateTime = LocalDateTime.of(reminderDate, reminderTime);

        // Chuyển sang OffsetDateTime với múi giờ hệ thống (UTC+7)
        entity.setReminderTime(OffsetDateTime.of(reminderDateTime, APP_ZONE_OFFSET));

        // Cập nhật reminderDate (trong Entity là OffsetDateTime)
        entity.setReminderDate(OffsetDateTime.of(reminderDate, LocalTime.MIN, APP_ZONE_OFFSET));
    }

    private UserReminderResponse mapEntityToResponse(UserReminder entity) {
        return UserReminderResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .reminderTime(entity.getReminderTime())
                .reminderDate(entity.getReminderDate())
                .repeatType(entity.getRepeatType())
                .enabled(entity.getEnabled())
                .targetType(entity.getTargetType().name())
                .targetId(entity.getTargetId() != null ? entity.getTargetId().toString() : null)
                .build();
    }
}