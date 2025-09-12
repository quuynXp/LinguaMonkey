package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.VideoSubtitle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VideoSubtitleRepository extends JpaRepository<VideoSubtitle, UUID> {
    List<VideoSubtitle> findByVideoId(UUID videoId);
}