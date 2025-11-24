package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserLearningActivity;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserLearningActivityRepository extends JpaRepository<UserLearningActivity, UUID> {
    @Query("SELECT ula FROM UserLearningActivity ula WHERE ula.userId = :userId AND ula.isDeleted = false")
    Page<UserLearningActivity> findByUserIdAndIsDeletedFalse(@Param("userId") UUID userId, Pageable pageable);

    List<UserLearningActivity> findTop5ByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT ula FROM UserLearningActivity ula WHERE ula.activityId = :id AND ula.isDeleted = false")
    Optional<UserLearningActivity> findByActivityIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE UserLearningActivity ula SET ula.isDeleted = true, ula.deletedAt = CURRENT_TIMESTAMP WHERE ula.activityId = :id AND ula.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    @Query("SELECT COUNT(ula) > 0 FROM UserLearningActivity ula WHERE ula.userId = :userId " +
            "AND DATE(ula.createdAt) = :date AND ula.isDeleted = false")
    boolean existsByUserIdAndDate(@Param("userId") UUID userId, @Param("date") LocalDate date);

    // Cập nhật query để tính tổng durationInSeconds và chia cho 60 để có tổng phút
    // Giả định: Trường durationMinutes trong query cũ phải là durationInSeconds nếu muốn tính thời gian học
    @Query("SELECT COALESCE(SUM(ula.durationInSeconds), 0) / 60 FROM UserLearningActivity ula WHERE ula.userId = :userId AND DATE(ula.createdAt) = :date AND ula.isDeleted = false")
    Long sumDurationMinutesByUserIdAndDate(@Param("userId") UUID userId, @Param("date") LocalDate date);

    @Query("SELECT ula FROM UserLearningActivity ula " +
            "WHERE ula.targetId = :lessonId " +
            "AND ula.activityType IN (:lessonTypes) " +
            "AND ula.createdAt BETWEEN :start AND :end")
    List<UserLearningActivity> findLessonActivities(
            @Param("lessonId") UUID lessonId,
            @Param("lessonTypes") List<ActivityType> lessonTypes,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end);

    List<UserLearningActivity> findByCreatedAtBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    List<UserLearningActivity> findByUserIdAndCreatedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

}