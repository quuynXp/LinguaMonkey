package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionReviewReaction;
import com.connectJPA.LinguaVietnameseApp.enums.ReactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseVersionReviewReactionRepository extends JpaRepository<CourseVersionReviewReaction, UUID> {
    Optional<CourseVersionReviewReaction> findByUserIdAndReviewId(UUID userId, UUID reviewId);
    boolean existsByUserIdAndReviewIdAndType(UUID userId, UUID reviewId, ReactionType type);
}