package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonQuestionRepository extends JpaRepository<LessonQuestion, UUID> {
    Page<LessonQuestion> findByLesson_LessonIdAndLanguageCodeAndIsDeletedFalse(UUID lessonId, String languageCode, Pageable pageable);

    Optional<LessonQuestion> findByLessonQuestionIdAndIsDeletedFalse(UUID id);

    List<LessonQuestion> findByLesson_LessonIdAndIsDeletedFalse(UUID lessonId);

    @Modifying
    @Query("UPDATE LessonQuestion lq SET lq.isDeleted = true, lq.deletedAt = CURRENT_TIMESTAMP WHERE lq.lessonQuestionId = :id AND lq.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    // long countByLessonIdAndIsDeletedFalse(UUID lessonId);

    long countByLesson_LessonId(UUID lessonId);

    long countByIsDeletedFalse();

    List<LessonQuestion> findByLesson_LessonIdOrderByOrderIndex(UUID lessonId);

}