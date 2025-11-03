package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.ReviewReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReviewReactionRepository extends JpaRepository<ReviewReaction, UUID> {
    Optional<ReviewReaction> findByReviewIdAndUserId(UUID reviewId, UUID userId);
    long countByReviewIdAndReaction(UUID reviewId, Short reaction);
}
