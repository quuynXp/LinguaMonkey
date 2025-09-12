package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface FlashcardRepository extends JpaRepository<Flashcard, UUID> {
    Page<Flashcard> findByLessonIdAndIsDeletedFalse(UUID lessonId, Pageable pageable);
    List<Flashcard> findByLessonIdAndIsDeletedFalseAndNextReviewAtBefore(UUID lessonId, OffsetDateTime time);
    List<Flashcard> findByUserIdAndIsDeletedFalseAndNextReviewAtBefore(UUID userId, OffsetDateTime time);
    Page<Flashcard> findByLessonIdAndFrontContainingIgnoreCaseAndIsDeletedFalse(UUID lessonId, String q, Pageable p);
}

