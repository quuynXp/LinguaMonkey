package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonReview;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonReviewMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonReviewRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LessonReviewServiceImpl implements LessonReviewService {

    private final LessonReviewRepository lessonReviewRepository;
    private final LessonReviewMapper lessonReviewMapper;

    @Override
    @Transactional
    public LessonReviewResponse createLessonReview(LessonReviewRequest request) {
        try {
            LessonReview lessonReview = lessonReviewMapper.toEntity(request);
            lessonReview = lessonReviewRepository.save(lessonReview);
            return lessonReviewMapper.toResponse(lessonReview);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create lesson review: " + e.getMessage(), e);
        }
    }

    @Override
    public LessonReviewResponse getLessonReviewById(UUID id) {
        try {
            LessonReview lessonReview = lessonReviewRepository.findByIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new RuntimeException("Lesson review not found"));
            return lessonReviewMapper.toResponse(lessonReview);
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve lesson review: " + e.getMessage(), e);
        }
    }

    @Override
    public Page<LessonReviewResponse> getAllLessonReviews(Pageable pageable) {
        try {
            Page<LessonReview> lessonReviews = lessonReviewRepository.findAllByIsDeletedFalse(pageable);
            return lessonReviews.map(lessonReviewMapper::toResponse);
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve all lesson reviews: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public LessonReviewResponse updateLessonReview(UUID id, LessonReviewRequest request) {
        try {
            LessonReview lessonReview = lessonReviewRepository.findByIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new RuntimeException("Lesson review not found"));
            lessonReviewMapper.updateEntityFromRequest(request, lessonReview);
            lessonReview = lessonReviewRepository.save(lessonReview);
            return lessonReviewMapper.toResponse(lessonReview);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update lesson review: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void deleteLessonReview(UUID id) {
        try {
            LessonReview lessonReview = lessonReviewRepository.findByIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new RuntimeException("Lesson review not found"));
            lessonReviewRepository.softDeleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete lesson review: " + e.getMessage(), e);
        }
    }
}