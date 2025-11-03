package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface CourseReviewRepository extends JpaRepository<CourseReview, UUID> {
    Page<CourseReview> findAllByCourseIdAndUserIdAndRatingAndIsDeletedFalse(UUID courseId, UUID userId, BigDecimal rating, Pageable pageable);
    Optional<CourseReview> findByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId);
}
