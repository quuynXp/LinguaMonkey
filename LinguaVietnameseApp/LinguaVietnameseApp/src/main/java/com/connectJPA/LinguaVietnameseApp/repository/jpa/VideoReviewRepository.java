package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.VideoReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface VideoReviewRepository extends JpaRepository<VideoReview, UUID> {
    Page<VideoReview> findByVideoId(UUID videoId, Pageable p);
    @Query("SELECT AVG(r.rating) FROM VideoReview r WHERE r.videoId = :videoId")
    Double avgRating(UUID videoId);
}
