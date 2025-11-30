package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface CourseReviewRepository extends JpaRepository<CourseReview, UUID> {
    Page<CourseReview> findByCourseIdAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(UUID courseId, Pageable pageable);

    Page<CourseReview> findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID parentReviewId, Pageable pageable);

    long countByParentReviewIdAndIsDeletedFalse(UUID parentReviewId);
    
    Page<CourseReview> findAllByCourseIdAndUserIdAndRatingAndIsDeletedFalse(UUID courseId, UUID userId, BigDecimal rating, Pageable pageable);
    Optional<CourseReview> findByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId);


@Query("SELECT AVG(c.rating) FROM CourseReview c WHERE c.courseId = :courseId AND c.parent IS NULL AND c.isDeleted = false")
    Double getAverageRatingByCourseId(@Param("courseId") UUID courseId);

    Page<CourseReview> findByCourseIdAndRatingAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(UUID courseId,
            BigDecimal rating, Pageable pageable);
            
    long countByCourseIdAndParentIsNullAndIsDeletedFalse(UUID courseId);
}
