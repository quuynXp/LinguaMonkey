package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface CourseVersionReviewRepository extends JpaRepository<CourseVersionReview, UUID> {
    Page<CourseVersionReview> findByCourseIdAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(UUID courseId, Pageable pageable);

    Page<CourseVersionReview> findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID parentReviewId, Pageable pageable);

    long countByParentReviewIdAndIsDeletedFalse(UUID parentReviewId);
    
    Page<CourseVersionReview> findAllByCourseIdAndUserIdAndRatingAndIsDeletedFalse(UUID courseId, UUID userId, BigDecimal rating, Pageable pageable);
    
    Optional<CourseVersionReview> findByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId);

    @Query("SELECT AVG(c.rating) FROM CourseVersionReview c WHERE c.courseId = :courseId AND c.parent IS NULL AND c.isDeleted = false")
    Double getAverageRatingByCourseId(@Param("courseId") UUID courseId);

    Page<CourseVersionReview> findByCourseIdAndRatingAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(UUID courseId,
            BigDecimal rating, Pageable pageable);
            
    long countByCourseIdAndParentIsNullAndIsDeletedFalse(UUID courseId);
}