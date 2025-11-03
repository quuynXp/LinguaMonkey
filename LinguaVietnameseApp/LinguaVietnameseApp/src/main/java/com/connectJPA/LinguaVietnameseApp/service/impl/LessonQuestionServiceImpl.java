package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonQuestionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonQuestionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonQuestionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonQuestionService;
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
public class LessonQuestionServiceImpl implements LessonQuestionService {
    private final LessonQuestionRepository lessonQuestionRepository;
    private final LessonQuestionMapper lessonQuestionMapper;

    @Override
    public Page<LessonQuestionResponse> getAllLessonQuestions(String lessonId, String languageCode, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID lessonUuid = (lessonId != null) ? UUID.fromString(lessonId) : null;
            Page<LessonQuestion> questions = lessonQuestionRepository.findByLessonIdAndLanguageCodeAndIsDeletedFalse(lessonUuid, languageCode, pageable);
            return questions.map(lessonQuestionMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all lesson questions: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LessonQuestionResponse getLessonQuestionById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_QUESTION_NOT_FOUND));
            return lessonQuestionMapper.toResponse(question);
        } catch (Exception e) {
            log.error("Error while fetching lesson question by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LessonQuestionResponse createLessonQuestion(LessonQuestionRequest request) {
        try {
            if (request == null || request.getLessonId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LessonQuestion question = lessonQuestionMapper.toEntity(request);
            question = lessonQuestionRepository.save(question);
            return lessonQuestionMapper.toResponse(question);
        } catch (Exception e) {
            log.error("Error while creating lesson question: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LessonQuestionResponse updateLessonQuestion(UUID id, LessonQuestionRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_QUESTION_NOT_FOUND));
            lessonQuestionMapper.updateEntityFromRequest(request, question);
            question = lessonQuestionRepository.save(question);
            return lessonQuestionMapper.toResponse(question);
        } catch (Exception e) {
            log.error("Error while updating lesson question ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteLessonQuestion(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_QUESTION_NOT_FOUND));
            lessonQuestionRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting lesson question ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}