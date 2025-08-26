package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.UserGoal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserGoalRepository extends JpaRepository<UserGoal, UUID> {
    @Query("SELECT ug FROM UserGoal ug WHERE ug.userId = :userId AND ug.languageCode = :languageCode AND ug.isDeleted = false")
    Page<UserGoal> findByUserIdAndLanguageCodeAndIsDeletedFalse(
            @Param("userId") UUID userId, @Param("languageCode") String languageCode, Pageable pageable);

    @Query("SELECT ug FROM UserGoal ug WHERE ug.goalId = :id AND ug.isDeleted = false")
    Optional<UserGoal> findByGoalIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE UserGoal ug SET ug.isDeleted = true, ug.deletedAt = CURRENT_TIMESTAMP WHERE ug.goalId = :id AND ug.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    List<UserGoal> findByUserIdAndIsDeletedFalse(UUID userId);
}