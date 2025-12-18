package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    @Query("SELECT l FROM Lesson l WHERE l.lessonName LIKE %:lessonName% AND (l.languageCode = :languageCode OR :languageCode IS NULL) AND (l.expReward >= :minExpReward OR :minExpReward IS NULL) AND l.isDeleted = false")
    Page<Lesson> findByCriteria(@Param("lessonName") String lessonName, @Param("languageCode") String languageCode, @Param("minExpReward") Integer minExpReward, Pageable pageable);

    @Query("SELECT l FROM Lesson l WHERE l.lessonId = :id AND l.isDeleted = false")
    Optional<Lesson> findByLessonIdAndIsDeletedFalse(@Param("id") UUID id);

    long countByIsDeletedFalse();

    @Query("UPDATE Lesson l SET l.isDeleted = true, l.deletedAt = CURRENT_TIMESTAMP WHERE l.lessonId = :id AND l.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);


    SkillType findSkillTypeByLessonIdAndIsDeletedFalse(UUID lessonId);

    List<Lesson> findByLessonIdIn(List<UUID> ids);
    List<Lesson> findByCreatorIdAndLessonIdIn(UUID creatorId, List<UUID> ids);
    Page<Lesson> findByCreatorId(UUID creatorId, Pageable pageable);

    List<Lesson> findTop50ByThumbnailUrlIsNullAndCreatedAtBefore(OffsetDateTime threshold);
    Page<Lesson> findAll(Specification<com.connectJPA.LinguaVietnameseApp.entity.Lesson> spec, Pageable pageable);

    @Query("SELECT l FROM Lesson l WHERE (" +
            "LOWER(l.lessonName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(l.description) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
            ") AND l.isDeleted = false " +
            "ORDER BY l.createdAt DESC")
    Page<Lesson> searchLessonsByKeyword(@Param("keyword") String keyword, Pageable pageable);

    List<Lesson> findByLessonSubCategoryIdAndSkillTypesAndIsDeletedFalseOrderByOrderIndex(UUID lessonSubCategoryId,
            SkillType skillType);

        Optional<Lesson> findFirstByCreatorIdAndLessonName(UUID creatorId, String lessonName);
}