package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.LessonReview;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.LessonReviewMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonReviewRepository;
import com.connectJPA.LinguaVietnameseApp.service.LessonReviewService;
import learning.ReviewQualityResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonReviewServiceImpl implements LessonReviewService {

    private final LessonReviewRepository lessonReviewRepository;
    private final LessonReviewMapper lessonReviewMapper;
    private final LessonProgressRepository lessonProgressRepository; // Cần để check 70%
    private final GrpcClientService grpcClientService;

    private static final double MIN_PROGRESS_PERCENT_TO_REVIEW = 70.0;

    @Override
    @Transactional
    public LessonReviewResponse createLessonReview(LessonReviewRequest request) {
        UUID userId = request.getUserId();
        UUID lessonId = request.getLessonId();

        LessonProgress progress = lessonProgressRepository.findById(new LessonProgressId(lessonId, userId))
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_PROGRESS_NOT_FOUND));

        if (progress.getMaxScore() == null || progress.getMaxScore() == 0) {
            throw new AppException(ErrorCode.INVALID_INPUT_DATA);
        }

        double percent = ((double) progress.getScore() / progress.getMaxScore()) * 100.0;
        if (percent < MIN_PROGRESS_PERCENT_TO_REVIEW) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        LessonReview review = lessonReviewMapper.toEntity(request);
        review.setVerified(false); // Mặc định

        // 5. Lưu review
        review = lessonReviewRepository.save(review);
        return lessonReviewMapper.toResponse(review);
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
    public LessonReviewResponse getLessonReviewByIds(UUID lessonId, UUID userId) {
        LessonReview review = lessonReviewRepository.findByLessonIdAndUserIdAndIsDeletedFalse(lessonId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
        return lessonReviewMapper.toResponse(review);
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

    @Transactional
    @Override
    public LessonReviewResponse updateLessonReview(UUID lessonId, UUID userId, LessonReviewRequest request) {
        LessonReview review = lessonReviewRepository.findByLessonIdAndUserIdAndIsDeletedFalse(lessonId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));

        lessonReviewMapper.updateEntityFromRequest(request, review);

        review = lessonReviewRepository.save(review);
        return lessonReviewMapper.toResponse(review);
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