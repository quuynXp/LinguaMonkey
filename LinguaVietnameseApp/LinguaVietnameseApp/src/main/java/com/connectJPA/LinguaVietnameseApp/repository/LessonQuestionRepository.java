package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonQuestionRepository extends JpaRepository<LessonQuestion, UUID> {
    @Query("SELECT lq FROM LessonQuestion lq WHERE lq.lessonId = :lessonId AND lq.languageCode = :languageCode AND lq.isDeleted = false")
    Page<LessonQuestion> findByLessonIdAndLanguageCodeAndIsDeletedFalse(@Param("lessonId") UUID lessonId, @Param("languageCode") String languageCode, Pageable pageable);

    @Query("SELECT lq FROM LessonQuestion lq WHERE lq.lessonQuestionId = :id AND lq.isDeleted = false")
    Optional<LessonQuestion> findByLessonQuestionIdAndIsDeletedFalse(@Param("id") UUID id);

    List<LessonQuestion> findByLessonIdAndIsDeletedFalse(UUID lessonId);

    @Query("UPDATE LessonQuestion lq SET lq.isDeleted = true, lq.deletedAt = CURRENT_TIMESTAMP WHERE lq.lessonQuestionId = :id AND lq.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);
}