package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, LessonProgressId> {
    @Query("SELECT lp FROM LessonProgress lp WHERE lp.id.lessonId = :lessonId AND lp.id.userId = :userId AND lp.isDeleted = false")
    Page<LessonProgress> findByLessonIdAndUserIdAndIsDeletedFalse(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT lp FROM LessonProgress lp WHERE lp.id.lessonId = :lessonId AND lp.id.userId = :userId AND lp.isDeleted = false")
    Optional<LessonProgress> findByLessonIdAndUserIdAndIsDeletedFalse(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId);

    Page<LessonProgress> findById_LessonIdAndId_UserIdAndIsDeletedFalse(UUID lessonId, UUID userId, Pageable pageable);

    Optional<LessonProgress> findById_LessonIdAndId_UserIdAndIsDeletedFalse(UUID lessonId, UUID userId);

    long countByIdUserIdAndCompletedAtIsNotNullAndIsDeletedFalse(UUID userId);

    long countById_UserIdAndCompletedAtIsNotNull(UUID userId);

    @Query("""
        SELECT lp.id.lessonId
        FROM LessonProgress lp
        JOIN CourseVersionLesson cvl ON lp.id.lessonId = cvl.id.lessonId
        WHERE lp.id.userId = :userId
        AND cvl.id.versionId = :versionId
        AND lp.score >= 50
        AND lp.isDeleted = false
    """)
    List<UUID> findCompletedLessonIdsInVersion(@Param("userId") UUID userId, @Param("versionId") UUID versionId);
    
    @Query("SELECT COUNT(lp) FROM LessonProgress lp " +
           "WHERE lp.id.userId = :userId " +
           "AND lp.completedAt >= :startDate AND lp.completedAt <= :endDate")
    int countCompletedLessons(@Param("userId") UUID userId, 
                              @Param("startDate") OffsetDateTime startDate, 
                              @Param("endDate") OffsetDateTime endDate);
                              

    @Modifying
    @Transactional
    @Query("UPDATE LessonProgress lp SET lp.isDeleted = true, lp.deletedAt = CURRENT_TIMESTAMP WHERE lp.id.lessonId = :lessonId AND lp.id.userId = :userId AND lp.isDeleted = false")
    void softDeleteByLessonIdAndUserId(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId);

    List<LessonProgress> findByIdUserIdAndUpdatedAtBetween(UUID userId, OffsetDateTime startOdt, OffsetDateTime endOdt);
}