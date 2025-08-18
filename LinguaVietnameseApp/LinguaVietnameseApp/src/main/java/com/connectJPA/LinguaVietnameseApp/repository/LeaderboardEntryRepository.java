package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LeaderboardEntryRepository extends JpaRepository<LeaderboardEntry, UUID> {
    @Query("SELECT le FROM LeaderboardEntry le WHERE le.leaderboardId = :leaderboardId AND le.userId = :userId AND le.isDeleted = false")
    Page<LeaderboardEntry> findByLeaderboardIdAndUserIdAndIsDeletedFalse(@Param("leaderboardId") UUID leaderboardId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT le FROM LeaderboardEntry le WHERE le.leaderboardId = :leaderboardId AND le.userId = :userId AND le.isDeleted = false")
    Optional<LeaderboardEntry> findByLeaderboardIdAndUserIdAndIsDeletedFalse(@Param("leaderboardId") UUID leaderboardId, @Param("userId") UUID userId);

    @Query("UPDATE LeaderboardEntry le SET le.isDeleted = true, le.deletedAt = CURRENT_TIMESTAMP WHERE le.leaderboardId = :leaderboardId AND le.userId = :userId AND le.isDeleted = false")
    void softDeleteByLeaderboardIdAndUserId(@Param("leaderboardId") UUID leaderboardId, @Param("userId") UUID userId);
}