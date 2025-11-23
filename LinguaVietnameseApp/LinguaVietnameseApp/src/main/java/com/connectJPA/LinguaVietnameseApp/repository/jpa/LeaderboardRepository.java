package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeaderboardRepository extends JpaRepository<Leaderboard, UUID> {

    @Query("SELECT l FROM Leaderboard l WHERE l.tab = :tab AND l.isDeleted = false " +
            "ORDER BY l.snapshotDate DESC, l.createdAt DESC")
    Page<Leaderboard> findLatestByTabAndIsDeletedFalse(
            @Param("tab") String tab,
            Pageable pageable);

    @Query("SELECT l FROM Leaderboard l WHERE l.leaderboardId = :id AND l.isDeleted = false")
    Optional<Leaderboard> findByLeaderboardIdAndIsDeletedFalse(@Param("id") UUID id);

    @Transactional
    @Modifying
    @Query("UPDATE Leaderboard l SET l.isDeleted = true, l.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE l.leaderboardId = :id AND l.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    Optional<Leaderboard> findTopByTabAndIsDeletedFalseOrderBySnapshotDateDescCreatedAtDesc(String tab);

    // Get latest single leaderboard by tab
    @Query("SELECT l FROM Leaderboard l WHERE l.tab = :tab AND l.isDeleted = false " +
            "ORDER BY l.snapshotDate DESC, l.createdAt DESC LIMIT 1")
    Optional<Leaderboard> findMostRecentByTab(@Param("tab") String tab);
}