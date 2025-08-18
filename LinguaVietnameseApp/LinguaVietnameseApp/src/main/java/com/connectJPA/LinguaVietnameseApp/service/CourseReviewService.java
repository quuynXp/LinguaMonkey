package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.UUID;

public interface CourseReviewService {
    Page<CourseReviewResponse> getAllCourseReviews(UUID courseId, UUID userId, BigDecimal rating, Pageable pageable);
    CourseReviewResponse getCourseReviewByIds(UUID courseId, UUID userId);
    CourseReviewResponse createCourseReview(CourseReviewRequest request);
    CourseReviewResponse updateCourseReview(UUID courseId, UUID userId, CourseReviewRequest request);
    void deleteCourseReview(UUID courseId, UUID userId);
}