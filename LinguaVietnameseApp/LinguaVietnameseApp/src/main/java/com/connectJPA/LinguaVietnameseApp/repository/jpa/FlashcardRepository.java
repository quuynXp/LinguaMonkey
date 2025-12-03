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

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.userId = :userId AND f.isDeleted = false")
    Page<Flashcard> findMyFlashcards(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.userId = :userId AND f.isDeleted = false AND (LOWER(f.front) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(f.back) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Flashcard> searchMyFlashcards(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, @Param("query") String query, Pageable pageable);

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.isPublic = true AND f.isDeleted = false")
    Page<Flashcard> findCommunityFlashcards(@Param("lessonId") UUID lessonId, Pageable pageable);

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.isPublic = true AND f.isDeleted = false AND (LOWER(f.front) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(f.back) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Flashcard> searchCommunityFlashcards(@Param("lessonId") UUID lessonId, @Param("query") String query, Pageable pageable);

    // FIXED: Return Entity (Flashcard) instead of DTO (FlashcardResponse)
    @Query("select f from Flashcard f where f.userId = :userId and f.lessonId = :lessonId and f.isDeleted = false and f.isSuspended = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndLessonIdAndIsDeletedFalseAndIsSuspendedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            @Param("userId") UUID userId, @Param("lessonId") UUID lessonId, @Param("now") OffsetDateTime now, Pageable pageable);

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.isDeleted = false AND (f.isPublic = true OR f.userId = :userId)")
    Page<Flashcard> findPublicOrPrivateFlashcards(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT f FROM Flashcard f WHERE f.lessonId = :lessonId AND f.isDeleted = false AND (f.isPublic = true OR f.userId = :userId) AND LOWER(f.front) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Flashcard> searchPublicOrPrivateFlashcards(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, @Param("query") String query, Pageable pageable);
    
    @Query("select f from Flashcard f where f.userId = :userId and f.isDeleted = false and f.isSuspended = false and f.nextReviewAt <= :now order by f.nextReviewAt asc")
    List<Flashcard> findByUserIdAndIsDeletedFalseAndIsSuspendedFalseAndNextReviewAtBeforeOrderByNextReviewAtAsc(
            @Param("userId") UUID userId, @Param("now") OffsetDateTime now, Pageable pageable);
}