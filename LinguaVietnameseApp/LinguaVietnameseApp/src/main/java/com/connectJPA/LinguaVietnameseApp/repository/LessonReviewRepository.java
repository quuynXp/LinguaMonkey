package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.LessonReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface LessonReviewRepository extends JpaRepository<LessonReview, UUID> {
    @Query("SELECT lr FROM LessonReview lr WHERE lr.reviewId = :id AND lr.isDeleted = false")
    Optional<LessonReview> findByIdAndIsDeletedFalse(UUID id);

    @Query("SELECT lr FROM LessonReview lr WHERE lr.isDeleted = false")
    Page<LessonReview> findAllByIsDeletedFalse(Pageable pageable);

    @Query("UPDATE LessonReview lr SET lr.isDeleted = true, lr.deletedAt = CURRENT_TIMESTAMP WHERE lr.reviewId = :id AND lr.isDeleted = false")
    void softDeleteById(UUID id);
}