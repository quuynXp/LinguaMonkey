package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonProgressWrongItem;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressWrongItemsId;
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

public interface LessonProgressWrongItemRepository extends JpaRepository<LessonProgressWrongItem, LessonProgressWrongItemsId> {
    Page<LessonProgressWrongItem> findById_LessonIdAndId_UserIdAndId_LessonQuestionIdAndIsDeletedFalse(UUID lessonId, UUID userId, UUID lessonQuestionId, Pageable pageable);

    Optional<LessonProgressWrongItem> findById_LessonIdAndId_UserIdAndId_LessonQuestionIdAndIsDeletedFalse(UUID lessonId, UUID userId, UUID lessonQuestionId);

    List<LessonProgressWrongItem> findById_LessonIdAndId_UserIdAndIsDeletedFalse(UUID lessonId, UUID userId);

    @Modifying
    @Transactional
    @Query("UPDATE LessonProgressWrongItem lpwi SET lpwi.isDeleted = true, lpwi.deletedAt = CURRENT_TIMESTAMP WHERE lpwi.id.lessonId = :lessonId AND lpwi.id.userId = :userId AND lpwi.id.lessonQuestionId = :lessonQuestionId AND lpwi.isDeleted = false")
    void softDeleteByLessonIdAndUserIdAndLessonQuestionId(
            @Param("lessonId") UUID lessonId,
            @Param("userId") UUID userId,
            @Param("lessonQuestionId") UUID lessonQuestionId);


}