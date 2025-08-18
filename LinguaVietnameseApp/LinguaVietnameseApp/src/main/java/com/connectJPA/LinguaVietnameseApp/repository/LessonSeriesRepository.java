package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.LessonSeries;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LessonSeriesRepository extends JpaRepository<LessonSeries, UUID> {
    @Query("SELECT ls FROM LessonSeries ls WHERE ls.lessonSeriesName = :lessonSeriesName AND ls.languageCode = :languageCode AND ls.isDeleted = false")
    Page<LessonSeries> findByLessonSeriesNameAndLanguageCodeAndIsDeletedFalse(@Param("lessonSeriesName") String lessonSeriesName, @Param("languageCode") String languageCode, Pageable pageable);

    @Query("SELECT ls FROM LessonSeries ls WHERE ls.lessonSeriesId = :id AND ls.isDeleted = false")
    Optional<LessonSeries> findByLessonSeriesIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE LessonSeries ls SET ls.isDeleted = true, ls.deletedAt = CURRENT_TIMESTAMP WHERE ls.lessonSeriesId = :id AND ls.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);
}