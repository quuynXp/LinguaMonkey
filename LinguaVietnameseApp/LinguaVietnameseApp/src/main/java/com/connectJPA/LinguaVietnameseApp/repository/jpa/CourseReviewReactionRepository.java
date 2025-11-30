package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseReviewReaction;
import com.connectJPA.LinguaVietnameseApp.enums.ReactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseReviewReactionRepository extends JpaRepository<CourseReviewReaction, UUID> {
    Optional<CourseReviewReaction> findByUserIdAndReviewId(UUID userId, UUID reviewId);
    boolean existsByUserIdAndReviewIdAndType(UUID userId, UUID reviewId, ReactionType type);
}