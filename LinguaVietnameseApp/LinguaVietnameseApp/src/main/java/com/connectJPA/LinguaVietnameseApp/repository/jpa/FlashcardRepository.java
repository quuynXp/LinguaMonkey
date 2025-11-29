package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Flashcard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface FlashcardRepository extends JpaRepository<Flashcard, UUID> {

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.isDeleted = false AND (f.isPublic = true OR f.userId = :userId)")
    Page<Flashcard> findPublicOrPrivateFlashcards(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.isDeleted = false AND (f.isPublic = true OR f.userId = :userId) AND LOWER(f.front) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Flashcard> searchPublicOrPrivateFlashcards(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, @Param("query") String query, Pageable pageable);

    // Kept for internal logic if needed, but UI fetch should use the methods above
    Page<Flashcard> findByLessonIdAndIsDeletedFalse(UUID lessonId, Pageable pageable);

    List<Flashcard> findByUserIdAndLessonIdAndIsDeletedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            UUID userId, UUID lessonId, OffsetDateTime now, Pageable pageable);

    @Query("select f from Flashcard f where f.userId = :userId and f.isDeleted = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndIsDeletedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            UUID userId, OffsetDateTime now, Pageable pageable);

    List<Flashcard> findByLessonIdAndIsDeletedFalseAndNextReviewAtBefore(UUID lessonId, OffsetDateTime time);

    List<Flashcard> findByUserIdAndIsDeletedFalseAndNextReviewAtBefore(UUID userId, OffsetDateTime now);

    @Query("select f from Flashcard f where f.userId = :userId and f.lessonId = :lessonId and f.isDeleted = false and f.isSuspended = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndLessonIdAndIsDeletedFalseAndIsSuspendedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            UUID userId, UUID lessonId, OffsetDateTime now, Pageable pageable);

    @Query("SELECT DISTINCT f.userId FROM Flashcard f WHERE f.isDeleted = false AND f.isSuspended = false AND f.nextReviewAt <= :now AND f.userId IS NOT NULL")
    List<UUID> findUserIdsWithPendingReviews(@Param("now") OffsetDateTime now);

    @Query("select f from Flashcard f where f.userId = :userId and f.isDeleted = false and f.isSuspended = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndIsDeletedFalseAndIsSuspendedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            UUID userId, OffsetDateTime now, Pageable pageable);

    Page<Flashcard> findByLessonIdAndFrontContainingIgnoreCaseAndIsDeletedFalse(UUID lessonId, String q, Pageable p);
}