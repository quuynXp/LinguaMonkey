package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LessonOrderInSeries;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonOrderInSeriesId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LessonOrderInSeriesRepository extends JpaRepository<LessonOrderInSeries, LessonOrderInSeriesId> {
    @Query("SELECT los FROM LessonOrderInSeries los WHERE los.id.lessonId = :lessonId AND los.id.lessonSeriesId = :lessonSeriesId AND los.isDeleted = false")
    Page<LessonOrderInSeries> findByLessonIdAndLessonSeriesIdAndIsDeletedFalse(
            @Param("lessonId") UUID lessonId,
            @Param("lessonSeriesId") UUID lessonSeriesId,
            Pageable pageable);

    @Query("SELECT los FROM LessonOrderInSeries los WHERE los.id.lessonId = :lessonId AND los.id.lessonSeriesId = :lessonSeriesId AND los.isDeleted = false")
    Optional<LessonOrderInSeries> findByLessonIdAndLessonSeriesIdAndIsDeletedFalse(
            @Param("lessonId") UUID lessonId,
            @Param("lessonSeriesId") UUID lessonSeriesId);

    Page<LessonOrderInSeries> findById_LessonIdAndId_LessonSeriesIdAndIsDeletedFalse(
            UUID lessonId,
            UUID lessonSeriesId,
            Pageable pageable);

    Optional<LessonOrderInSeries> findById_LessonIdAndId_LessonSeriesIdAndIsDeletedFalse(
            UUID lessonId,
            UUID lessonSeriesId);

    @Modifying
    @Query("UPDATE LessonOrderInSeries los SET los.isDeleted = true, los.deletedAt = CURRENT_TIMESTAMP WHERE los.id.lessonId = :lessonId AND los.id.lessonSeriesId = :lessonSeriesId AND los.isDeleted = false")
    void softDeleteByLessonIdAndLessonSeriesId(
            @Param("lessonId") UUID lessonId,
            @Param("lessonSeriesId") UUID lessonSeriesId);

}