package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonCategory;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
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

    @Query("""
        SELECT lc FROM LessonCategory lc 
        WHERE (:lessonCategoryName IS NULL OR lc.lessonCategoryName = :lessonCategoryName)
        AND (:languageCode IS NULL OR lc.languageCode = :languageCode)
        AND lc.isDeleted = false
        """)
    Page<LessonCategory> findByOptionalFilters(@Param("lessonCategoryName") String lessonCategoryName, @Param("languageCode") String languageCode, Pageable pageable);


    Optional<LessonCategory> findByLessonCategoryIdAndIsDeletedFalse(UUID id);

    @Modifying
    @Query("UPDATE LessonCategory lc SET lc.isDeleted = true, lc.deletedAt = CURRENT_TIMESTAMP WHERE lc.lessonCategoryId = :id AND lc.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    @Query("""
        SELECT DISTINCT lc FROM LessonCategory lc 
        JOIN Lesson l ON lc.lessonCategoryId = l.lessonCategoryId
        WHERE l.skillTypes = :skillType 
        AND lc.languageCode = :languageCode
        AND lc.isDeleted = false
        """)
    List<LessonCategory> findDistinctCategoriesByLessonSkillAndLanguage(@Param("skillType") SkillType skillType, @Param("languageCode") String languageCode);

}