package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface FlashcardRepository extends JpaRepository<Flashcard, UUID> {
    Page<Flashcard> findByLessonIdAndIsDeletedFalse(UUID lessonId, Pageable pageable);
    @Query("select f from Flashcard f where f.userId = :userId and f.lessonId = :lessonId and f.isDeleted = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndLessonIdAndIsDeletedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            UUID userId, UUID lessonId, OffsetDateTime now, Pageable pageable);

    @Query("select f from Flashcard f where f.userId = :userId and f.isDeleted = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndIsDeletedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            UUID userId, OffsetDateTime now, Pageable pageable);
    List<Flashcard> findByLessonIdAndIsDeletedFalseAndNextReviewAtBefore(UUID lessonId, OffsetDateTime time);
    List<Flashcard> findByUserIdAndIsDeletedFalseAndNextReviewAtBefore(UUID userId, OffsetDateTime time);
    Page<Flashcard> findByLessonIdAndFrontContainingIgnoreCaseAndIsDeletedFalse(UUID lessonId, String q, Pageable p);
}

