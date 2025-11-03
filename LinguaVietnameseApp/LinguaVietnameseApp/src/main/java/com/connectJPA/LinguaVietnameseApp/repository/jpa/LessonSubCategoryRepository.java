package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonSubCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LessonSubCategoryRepository extends JpaRepository<LessonSubCategory, UUID> {
    @Query("SELECT lsc FROM LessonSubCategory lsc WHERE lsc.lessonCategoryId = :lessonCategoryId AND lsc.languageCode = :languageCode AND lsc.isDeleted = false")
    Page<LessonSubCategory> findByLessonCategoryIdAndLanguageCodeAndIsDeletedFalse(@Param("lessonCategoryId") UUID lessonCategoryId, @Param("languageCode") String languageCode, Pageable pageable);

    @Query("SELECT lsc FROM LessonSubCategory lsc WHERE lsc.lessonSubCategoryId = :id AND lsc.isDeleted = false")
    Optional<LessonSubCategory> findByLessonSubCategoryIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE LessonSubCategory lsc SET lsc.isDeleted = true, lsc.deletedAt = CURRENT_TIMESTAMP WHERE lsc.lessonSubCategoryId = :id AND lsc.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);
}