package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, LessonProgressId> {
    @Query("SELECT lp FROM LessonProgress lp WHERE lp.id.lessonId = :lessonId AND lp.id.userId = :userId AND lp.isDeleted = false")
    Page<LessonProgress> findByLessonIdAndUserIdAndIsDeletedFalse(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT lp FROM LessonProgress lp WHERE lp.id.lessonId = :lessonId AND lp.id.userId = :userId AND lp.isDeleted = false")
    Optional<LessonProgress> findByLessonIdAndUserIdAndIsDeletedFalse(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query("UPDATE LessonProgress lp SET lp.isDeleted = true, lp.deletedAt = CURRENT_TIMESTAMP WHERE lp.id.lessonId = :lessonId AND lp.id.userId = :userId AND lp.isDeleted = false")
    void softDeleteByLessonIdAndUserId(@Param("lessonId") UUID lessonId, @Param("userId") UUID userId);
}