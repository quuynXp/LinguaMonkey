package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.UserLearningActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface UserLearningActivityRepository extends JpaRepository<UserLearningActivity, UUID> {
    @Query("SELECT ula FROM UserLearningActivity ula WHERE ula.userId = :userId AND ula.isDeleted = false")
    Page<UserLearningActivity> findByUserIdAndIsDeletedFalse(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT ula FROM UserLearningActivity ula WHERE ula.activityId = :id AND ula.isDeleted = false")
    Optional<UserLearningActivity> findByActivityIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE UserLearningActivity ula SET ula.isDeleted = true, ula.deletedAt = CURRENT_TIMESTAMP WHERE ula.activityId = :id AND ula.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    @Query("SELECT COUNT(ula) > 0 FROM UserLearningActivity ula WHERE ula.userId = :userId " +
            "AND DATE(ula.createdAt) = :date AND ula.isDeleted = false")
    boolean existsByUserIdAndDate(@Param("userId") UUID userId, @Param("date") LocalDate date);
}