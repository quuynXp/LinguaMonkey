package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateFlashcardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.MemorizationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.FlashcardResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemorizationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import com.connectJPA.LinguaVietnameseApp.entity.UserReminder;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.FlashcardService;
import com.connectJPA.LinguaVietnameseApp.service.UserMemorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
@Slf4j
public class UserMemorizationServiceImpl implements UserMemorizationService {
    private final UserMemorizationRepository memorizationRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final UserReminderRepository reminderRepository;
    
    private final FlashcardService flashcardService;

    private static final String PERSONAL_LESSON_NAME = "My Personal Notebook";

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

        UserMemorization memorization = UserMemorization.builder()
                .userId(request.getUserId())
                .contentType(request.getContentType())
                .contentId(request.getContentId())
                .noteText(request.getNoteText())
                .definition(request.getDefinition())
                .example(request.getExample())
                .imageUrl(request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .isFavorite(request.isFavorite())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();

        memorization = memorizationRepository.save(memorization);

        if (request.getContentType() == ContentType.VOCABULARY) {
            syncToFlashcardSystem(memorization, request);
        }

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
        memorization.setDefinition(request.getDefinition());
        memorization.setExample(request.getExample());
        memorization.setImageUrl(request.getImageUrl());
        memorization.setAudioUrl(request.getAudioUrl());
        memorization.setFavorite(request.isFavorite());
        memorization.setUpdatedAt(OffsetDateTime.now());

        memorization = memorizationRepository.save(memorization);

        if (memorization.getLinkedFlashcardId() != null) {
            updateLinkedFlashcard(memorization, request);
        }

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

        if (memorization.getLinkedFlashcardId() != null) {
            try {
                flashcardService.deleteFlashcard(memorization.getLinkedFlashcardId(), authenticatedUserId);
            } catch (Exception e) {
                log.warn("Failed to delete linked flashcard: {}", e.getMessage());
            }
        }

        memorization.setDeleted(true);
        memorization.setDeletedAt(OffsetDateTime.now());
        memorizationRepository.save(memorization);
        
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
        Pageable sortedPageable = PageRequest.of(
            pageable.getPageNumber(), 
            pageable.getPageSize(), 
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        if (contentType != null && !contentType.isEmpty() && !contentType.equals("all")) {
            try {
                ContentType type = ContentType.valueOf(contentType);
                memorizations = memorizationRepository.findByUserIdAndContentTypeAndIsDeletedFalse(userId, type, sortedPageable);
            } catch (IllegalArgumentException e) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
        } else {
            memorizations = memorizationRepository.findByUserIdAndIsDeletedFalse(userId, sortedPageable);
        }
        return memorizations.map(this::mapToResponse);
    }

    private void handleReminderLogic(UserMemorization note, MemorizationRequest request) {
        Optional<UserReminder> existingReminderOpt = reminderRepository.findByTargetIdAndTargetType(note.getMemorizationId(), TargetType.NOTE);

        if (request.isReminderEnabled()) {
            OffsetDateTime reminderTimeObj = OffsetDateTime.now();
            if (request.getReminderTime() != null && !request.getReminderTime().isEmpty()) {
                try {
                    LocalTime time = LocalTime.parse(request.getReminderTime(), DateTimeFormatter.ofPattern("HH:mm"));
                    reminderTimeObj = OffsetDateTime.of(LocalDate.now(), time, ZoneOffset.UTC); 
                } catch (Exception e) {
                    log.error("Invalid time format", e);
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
            if (existingReminderOpt.isPresent()) {
                reminderRepository.delete(existingReminderOpt.get()); 
            }
        }
    }

    private void syncToFlashcardSystem(UserMemorization note, MemorizationRequest req) {
        try {
            Lesson personalLesson = lessonRepository.findFirstByCreatorIdAndLessonName(note.getUserId(), PERSONAL_LESSON_NAME)
                    .orElseGet(() -> createPersonalLesson(note.getUserId()));

            CreateFlashcardRequest flashcardReq = CreateFlashcardRequest.builder()
                    .lessonId(personalLesson.getLessonId())
                    .front(req.getNoteText())
                    .back(req.getDefinition() != null ? req.getDefinition() : "No definition")
                    .exampleSentence(req.getExample())
                    .imageUrl(req.getImageUrl())
                    .audioUrl(req.getAudioUrl())
                    .tags("personal_note")
                    .isPublic(false)
                    .build();

            FlashcardResponse flashcard = flashcardService.createFlashcard(flashcardReq, note.getUserId());
            
            note.setLinkedFlashcardId(flashcard.getFlashcardId());
            memorizationRepository.save(note);
            
        } catch (Exception e) {
            log.error("Failed to sync note to flashcard: {}", e.getMessage());
        }
    }

    private void updateLinkedFlashcard(UserMemorization note, MemorizationRequest req) {
        try {
            CreateFlashcardRequest flashcardReq = CreateFlashcardRequest.builder()
                    .front(req.getNoteText())
                    .back(req.getDefinition())
                    .exampleSentence(req.getExample())
                    .imageUrl(req.getImageUrl())
                    .audioUrl(req.getAudioUrl())
                    .isPublic(false)
                    .build();
            
            flashcardService.updateFlashcard(note.getLinkedFlashcardId(), flashcardReq, note.getUserId());
        } catch (Exception e) {
            log.error("Failed to update linked flashcard: {}", e.getMessage());
        }
    }

    private Lesson createPersonalLesson(UUID userId) {
        Lesson lesson = Lesson.builder()
                .creatorId(userId)
                .lessonName(PERSONAL_LESSON_NAME)
                .title("My Personal Vocabulary")
                .languageCode("vi") 
                .lessonType(LessonType.REGULAR)
                .skillTypes(SkillType.VOCABULARY)
                .isFree(true)
                .difficultyLevel(DifficultyLevel.EASY)
                .build();
        return lessonRepository.save(lesson);
    }

    private MemorizationResponse mapToResponse(UserMemorization memorization) {
        Optional<UserReminder> reminderOpt = reminderRepository.findByTargetIdAndTargetType(memorization.getMemorizationId(), TargetType.NOTE);
        
        String timeStr = null;
        if (reminderOpt.isPresent()) {
            timeStr = reminderOpt.get().getReminderTime().format(DateTimeFormatter.ofPattern("HH:mm"));
        }

        return MemorizationResponse.builder()
                .memorizationId(memorization.getMemorizationId())
                .userId(memorization.getUserId())
                .contentType(memorization.getContentType())
                .contentId(memorization.getContentId())
                .noteText(memorization.getNoteText())
                .definition(memorization.getDefinition())
                .example(memorization.getExample())
                .imageUrl(memorization.getImageUrl())
                .audioUrl(memorization.getAudioUrl())
                .linkedFlashcardId(memorization.getLinkedFlashcardId())
                .isFavorite(memorization.isFavorite())
                .createdAt(memorization.getCreatedAt())
                .updatedAt(memorization.getUpdatedAt())
                .isReminderEnabled(reminderOpt.isPresent() && Boolean.TRUE.equals(reminderOpt.get().getEnabled()))
                .reminderTime(timeStr)
                .repeatType(reminderOpt.map(UserReminder::getRepeatType).orElse(null))
                .reminderTitle(reminderOpt.map(UserReminder::getTitle).orElse(null))
                .build();
    }
}