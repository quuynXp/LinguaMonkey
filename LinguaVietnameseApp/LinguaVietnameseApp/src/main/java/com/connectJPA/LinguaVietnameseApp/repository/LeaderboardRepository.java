package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LeaderboardRepository extends JpaRepository<Leaderboard, UUID> {
    @Query("SELECT l FROM Leaderboard l WHERE l.period = :period AND l.tab = :tab AND l.isDeleted = false")
    Page<Leaderboard> findByPeriodAndTabAndIsDeletedFalse(@Param("period") String period, @Param("tab") String tab, Pageable pageable);

    @Query("SELECT l FROM Leaderboard l WHERE l.leaderboardId = :id AND l.isDeleted = false")
    Optional<Leaderboard> findByLeaderboardIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE Leaderboard l SET l.isDeleted = true, l.deletedAt = CURRENT_TIMESTAMP WHERE l.leaderboardId = :id AND l.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);
}