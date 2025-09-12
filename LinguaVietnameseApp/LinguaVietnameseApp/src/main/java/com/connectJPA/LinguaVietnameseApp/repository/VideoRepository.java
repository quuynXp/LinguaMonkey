package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Video;
import com.connectJPA.LinguaVietnameseApp.enums.VideoType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VideoRepository extends JpaRepository<Video, UUID> {
    List<Video> findByLessonIdAndIsDeletedFalse(UUID lessonId);
    Page<Video> findAllByType(VideoType type, Pageable pageable);
    Page<Video> findAllByTypeAndLevel(VideoType type, String level, Pageable pageable);
    Page<Video> findAllByLevel(String level, Pageable pageable);
    List<Video> findDistinctByTypeIsNotNull();
}
