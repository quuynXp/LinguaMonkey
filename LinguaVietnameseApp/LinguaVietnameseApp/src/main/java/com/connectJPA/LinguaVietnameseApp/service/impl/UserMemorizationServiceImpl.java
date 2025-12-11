package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.MemorizationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemorizationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.UserMemorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserMemorizationServiceImpl implements UserMemorizationService {
    private final UserMemorizationRepository memorizationRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    // INJECT THÊM REPO REMINDER
    private final UserReminderRepository reminderRepository;

    @Override
    public Page<MemorizationResponse> searchMemorizations(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
             return Page.empty();
        }
        try {
            String currentUserIdString = SecurityContextHolder.getContext().getAuthentication().getName();
            UUID currentUserId = UUID.fromString(currentUserIdString);
            Pageable pageable = PageRequest.of(page, size);
            Page<UserMemorization> result = memorizationRepository.searchMemorizationsByKeyword(currentUserId, keyword, pageable);
            return result.map(this::mapToResponse);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    @Override
    public MemorizationResponse saveMemorization(MemorizationRequest request, UUID authenticatedUserId) {
        if (!request.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getNoteText() == null || request.getNoteText().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        // Validate contentId logic (giữ nguyên switch case cũ của bạn)
        if (request.getContentId() != null) {
            switch (request.getContentType()) {
                case EVENT:
                    if (!eventRepository.existsById(request.getContentId())) throw new AppException(ErrorCode.EVENT_NOT_FOUND);
                    break;
                case LESSON:
                    if (!lessonRepository.existsById(request.getContentId())) throw new AppException(ErrorCode.LESSON_NOT_FOUND);
                    break;
                case VIDEO:
                    if (!videoRepository.existsById(request.getContentId())) throw new AppException(ErrorCode.VIDEO_NOT_FOUND);
                    break;
                default: break;
            }
        }

        // 1. Lưu Memorization trước
        UserMemorization memorization = UserMemorization.builder()
                .userId(request.getUserId())
                .contentType(request.getContentType())
                .contentId(request.getContentId())
                .noteText(request.getNoteText())
                .isFavorite(request.isFavorite())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();

        memorization = memorizationRepository.save(memorization);

        // 2. Xử lý Reminder ngay sau khi lưu Note
        handleReminderLogic(memorization, request);

        return mapToResponse(memorization);
    }

    @Transactional
    @Override
    public MemorizationResponse updateMemorization(UUID memorizationId, MemorizationRequest request, UUID authenticatedUserId) {
        UserMemorization memorization = memorizationRepository.findById(memorizationId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMORIZATION_NOT_FOUND));

        if (!memorization.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        memorization.setContentType(request.getContentType());
        memorization.setContentId(request.getContentId());
        memorization.setNoteText(request.getNoteText());
        memorization.setFavorite(request.isFavorite());
        memorization.setUpdatedAt(OffsetDateTime.now());

        memorization = memorizationRepository.save(memorization);

        // Xử lý cập nhật/xóa Reminder
        handleReminderLogic(memorization, request);

        return mapToResponse(memorization);
    }

    @Transactional
    @Override
    public void deleteMemorization(UUID memorizationId, UUID authenticatedUserId) {
        UserMemorization memorization = memorizationRepository.findById(memorizationId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMORIZATION_NOT_FOUND));

        if (!memorization.getUserId().equals(authenticatedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Soft delete Note
        memorization.setDeleted(true);
        memorization.setDeletedAt(OffsetDateTime.now());
        memorizationRepository.save(memorization);
        
        // Disable luôn Reminder liên quan (nếu có)
        Optional<UserReminder> reminderOpt = reminderRepository.findByTargetIdAndTargetType(memorizationId, TargetType.NOTE);
        if (reminderOpt.isPresent()) {
            UserReminder reminder = reminderOpt.get();
            reminder.setEnabled(false);
            reminderRepository.save(reminder);
        }
    }

    @Override
    public Page<MemorizationResponse> getMemorizationsByUser(UUID userId, String contentType, Pageable pageable) {
        Page<UserMemorization> memorizations;
        if (contentType != null && !contentType.isEmpty() && !contentType.equals("all")) {
            try {
                ContentType type = ContentType.valueOf(contentType);
                memorizations = memorizationRepository.findByUserIdAndContentTypeAndIsDeletedFalse(userId, type, pageable);
            } catch (IllegalArgumentException e) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
        } else {
            memorizations = memorizationRepository.findByUserIdAndIsDeletedFalse(userId, pageable);
        }
        // Map sang response (sẽ query reminder trong hàm map)
        return memorizations.map(this::mapToResponse);
    }

    // --- HELPER METHODS ---

    private void handleReminderLogic(UserMemorization note, MemorizationRequest request) {
        // Tìm xem đã có reminder cho note này chưa (giả sử Repository có hàm findByTargetIdAndTargetType)
        // Bạn cần thêm method này vào UserReminderRepository nếu chưa có: Optional<UserReminder> findByTargetIdAndTargetType(UUID targetId, TargetType targetType);
        Optional<UserReminder> existingReminderOpt = reminderRepository.findByTargetIdAndTargetType(note.getMemorizationId(), TargetType.NOTE);

        if (request.isReminderEnabled()) {
            // Parse time string "HH:mm" thành OffsetDateTime (Dùng ngày hiện tại + giờ user chọn)
            OffsetDateTime reminderTimeObj = OffsetDateTime.now();
            if (request.getReminderTime() != null && !request.getReminderTime().isEmpty()) {
                try {
                    LocalTime time = LocalTime.parse(request.getReminderTime(), DateTimeFormatter.ofPattern("HH:mm"));
                    // Kết hợp ngày mai hoặc hôm nay tùy logic, ở đây lấy ngày hiện tại + giờ đó
                    reminderTimeObj = OffsetDateTime.of(LocalDate.now(), time, ZoneOffset.UTC); 
                } catch (Exception e) {
                    // Log error or ignore
                }
            }

            UserReminder reminder = existingReminderOpt.orElse(UserReminder.builder()
                    .userId(note.getUserId())
                    .targetType(TargetType.NOTE)
                    .targetId(note.getMemorizationId())
                    .build());

            reminder.setTitle(request.getReminderTitle() != null ? request.getReminderTitle() : "Review Note");
            reminder.setMessage(note.getNoteText().length() > 50 ? note.getNoteText().substring(0, 50) + "..." : note.getNoteText());
            reminder.setReminderTime(reminderTimeObj);
            reminder.setRepeatType(request.getRepeatType());
            reminder.setEnabled(true);
            
            reminderRepository.save(reminder);
        } else {
            // Nếu user tắt reminder mà database đang có -> Xóa hoặc Disable
            if (existingReminderOpt.isPresent()) {
                reminderRepository.delete(existingReminderOpt.get()); // Hoặc setEnabled(false) tùy logic soft delete
            }
        }
    }

    private MemorizationResponse mapToResponse(UserMemorization memorization) {
        // Query ngược lại bảng Reminder để lấy thông tin trả về
        Optional<UserReminder> reminderOpt = reminderRepository.findByTargetIdAndTargetType(memorization.getMemorizationId(), TargetType.NOTE);
        
        String timeStr = null;
        if (reminderOpt.isPresent()) {
            // Convert OffsetDateTime về "HH:mm"
            timeStr = reminderOpt.get().getReminderTime().format(DateTimeFormatter.ofPattern("HH:mm"));
        }

        return MemorizationResponse.builder()
                .memorizationId(memorization.getMemorizationId())
                .userId(memorization.getUserId())
                .contentType(memorization.getContentType())
                .contentId(memorization.getContentId())
                .noteText(memorization.getNoteText())
                .isFavorite(memorization.isFavorite())
                .createdAt(memorization.getCreatedAt())
                .updatedAt(memorization.getUpdatedAt())
                // Mapping Reminder fields
                .isReminderEnabled(reminderOpt.isPresent() && Boolean.TRUE.equals(reminderOpt.get().getEnabled()))
                .reminderTime(timeStr)
                .repeatType(reminderOpt.map(UserReminder::getRepeatType).orElse(null))
                .reminderTitle(reminderOpt.map(UserReminder::getTitle).orElse(null))
                .build();
    }
}