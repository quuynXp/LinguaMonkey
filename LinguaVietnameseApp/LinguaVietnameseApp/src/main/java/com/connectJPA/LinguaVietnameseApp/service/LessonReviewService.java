package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LessonReviewService {
    LessonReviewResponse createLessonReview(LessonReviewRequest request);
    LessonReviewResponse getLessonReviewById(UUID id);
    Page<LessonReviewResponse> getAllLessonReviews(Pageable pageable);
    LessonReviewResponse updateLessonReview(UUID id, LessonReviewRequest request);
    void deleteLessonReview(UUID id);
}