package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.VideoReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VideoReactionRepository extends JpaRepository<VideoReaction, UUID> {
    Optional<VideoReaction> findByVideoIdAndUserId(UUID videoId, UUID userId);
    long countByVideoIdAndReaction(UUID videoId, Short reaction);
}
