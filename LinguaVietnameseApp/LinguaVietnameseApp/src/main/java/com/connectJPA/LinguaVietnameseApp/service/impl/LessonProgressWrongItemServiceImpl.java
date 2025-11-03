package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressWrongItemRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressWrongItemResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgressWrongItem;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonProgressWrongItemMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressWrongItemRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonProgressWrongItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProgressWrongItemServiceImpl implements LessonProgressWrongItemService {
    private final LessonProgressWrongItemRepository lessonProgressWrongItemRepository;
    private final LessonProgressWrongItemMapper lessonProgressWrongItemMapper;

    @Override
    public Page<LessonProgressWrongItemResponse> getAllLessonProgressWrongItems(UUID lessonId, UUID userId, UUID lessonQuestionId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<LessonProgressWrongItem> wrongItems = lessonProgressWrongItemRepository.findById_LessonIdAndId_UserIdAndId_LessonQuestionIdAndIsDeletedFalse(lessonId, userId, lessonQuestionId, pageable);
            return wrongItems.map(lessonProgressWrongItemMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson progress wrong items: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LessonProgressWrongItemResponse getLessonProgressWrongItemByIds(UUID lessonId, UUID userId, UUID lessonQuestionId) {
        try {
            if (lessonId == null || userId == null || lessonQuestionId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonProgressWrongItem wrongItem = lessonProgressWrongItemRepository.findById_LessonIdAndId_UserIdAndId_LessonQuestionIdAndIsDeletedFalse(lessonId, userId, lessonQuestionId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_WRONG_ITEM_NOT_FOUND));
            return lessonProgressWrongItemMapper.toResponse(wrongItem);
        } catch (Exception e) {
            log.error("Error while fetching lesson progress wrong item by IDs {} {} {}: {}", lessonId, userId, lessonQuestionId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LessonProgressWrongItemResponse createLessonProgressWrongItem(LessonProgressWrongItemRequest request) {
        try {
            if (request == null || request.getLessonId() == null || request.getUserId() == null || request.getLessonQuestionId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonProgressWrongItem wrongItem = lessonProgressWrongItemMapper.toEntity(request);
            wrongItem = lessonProgressWrongItemRepository.save(wrongItem);
            return lessonProgressWrongItemMapper.toResponse(wrongItem);
        } catch (Exception e) {
            log.error("Error while creating lesson progress wrong item: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LessonProgressWrongItemResponse updateLessonProgressWrongItem(UUID lessonId, UUID userId, UUID lessonQuestionId, LessonProgressWrongItemRequest request) {
        try {
            if (lessonId == null || userId == null || lessonQuestionId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonProgressWrongItem wrongItem = lessonProgressWrongItemRepository.findById_LessonIdAndId_UserIdAndId_LessonQuestionIdAndIsDeletedFalse(lessonId, userId, lessonQuestionId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_WRONG_ITEM_NOT_FOUND));
            lessonProgressWrongItemMapper.updateEntityFromRequest(request, wrongItem);
            wrongItem = lessonProgressWrongItemRepository.save(wrongItem);
            return lessonProgressWrongItemMapper.toResponse(wrongItem);
        } catch (Exception e) {
            log.error("Error while updating lesson progress wrong item for {} {} {}: {}", lessonId, userId, lessonQuestionId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteLessonProgressWrongItem(UUID lessonId, UUID userId, UUID lessonQuestionId) {
        try {
            if (lessonId == null || userId == null || lessonQuestionId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonProgressWrongItem wrongItem = lessonProgressWrongItemRepository.findById_LessonIdAndId_UserIdAndId_LessonQuestionIdAndIsDeletedFalse(lessonId, userId, lessonQuestionId)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_WRONG_ITEM_NOT_FOUND));
            lessonProgressWrongItemRepository.softDeleteByLessonIdAndUserIdAndLessonQuestionId(lessonId, userId, lessonQuestionId);
        } catch (Exception e) {
            log.error("Error while deleting lesson progress wrong item for {} {} {}: {}", lessonId, userId, lessonQuestionId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}