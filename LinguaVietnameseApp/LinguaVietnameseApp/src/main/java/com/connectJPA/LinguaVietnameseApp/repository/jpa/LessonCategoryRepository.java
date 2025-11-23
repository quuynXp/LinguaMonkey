package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LessonCategoryRepository extends JpaRepository<LessonCategory, UUID> {
    @Query("SELECT lc FROM LessonCategory lc WHERE lc.lessonCategoryName = 'CERTIFICATE' AND lc.isDeleted = false")
    Page<LessonCategory> findAllCertificates(Pageable pageable);

    @Query("SELECT lc FROM LessonCategory lc WHERE lc.lessonCategoryId = :id AND lc.lessonCategoryName = 'CERTIFICATE' AND lc.isDeleted = false")
    Optional<LessonCategory> findCertificateById(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE LessonCategory lc SET lc.isDeleted = true, lc.deletedAt = CURRENT_TIMESTAMP WHERE lc.lessonCategoryId = :id AND lc.lessonCategoryName = 'CERTIFICATE' AND lc.isDeleted = false")
    void softDeleteCertificateById(@Param("id") UUID id);

    Page<LessonCategory> findByLessonCategoryNameAndLanguageCodeAndIsDeletedFalse(String lessonCategoryName, String languageCode, Pageable pageable);

    Optional<LessonCategory> findByLessonCategoryIdAndIsDeletedFalse(UUID id);

    @Modifying
    @Query("UPDATE LessonCategory lc SET lc.isDeleted = true, lc.deletedAt = CURRENT_TIMESTAMP WHERE lc.lessonCategoryId = :id AND lc.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

}