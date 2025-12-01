package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.UUID;

public interface CourseVersionReviewService {
    // Thêm tham số currentUserId vào các hàm get
    Page<CourseVersionReviewResponse> getAllCourseVersionReviews(UUID courseId, UUID currentUserId, BigDecimal rating, Pageable pageable);
    
    // Sửa signature: thêm currentUserId
    Page<CourseVersionReviewResponse> getRepliesByParentId(UUID parentId, UUID currentUserId, Pageable pageable);
    
    CourseVersionReviewResponse getCourseVersionReviewByIds(UUID courseId, UUID userId);

    CourseVersionReviewResponse createCourseVersionReview(CourseVersionReviewRequest request);

    CourseVersionReviewResponse updateCourseVersionReview(UUID courseId, UUID userId, CourseVersionReviewRequest request);

    void deleteCourseVersionReview(UUID courseId, UUID userId);

    void likeReview(UUID reviewId, UUID userId);

    void unlikeReview(UUID reviewId, UUID userId);

    void dislikeReview(UUID reviewId, UUID userId);

    void undislikeReview(UUID reviewId, UUID userId);
}