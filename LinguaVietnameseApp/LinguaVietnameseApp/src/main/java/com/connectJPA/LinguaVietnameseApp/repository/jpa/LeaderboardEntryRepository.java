package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeaderboardEntryRepository extends JpaRepository<LeaderboardEntry, LeaderboardEntryId> {

    @Query("SELECT le FROM LeaderboardEntry le JOIN le.user u " +
           "WHERE le.id.leaderboardId = :leaderboardId " +
           "AND le.isDeleted = false AND u.isDeleted = false")
    Page<LeaderboardEntry> findByLeaderboardIdAndIsDeletedFalse(
            @Param("leaderboardId") UUID leaderboardId,
            Pageable pageable);

    @Query(value = "SELECT rank FROM (" +
            " SELECT user_id, RANK() OVER (PARTITION BY leaderboard_id ORDER BY score DESC) as rank" +
            " FROM leaderboard_entries" +
            " WHERE leaderboard_id = :leaderboardId AND is_deleted = false" +
            ") as ranked_entries WHERE user_id = :userId", nativeQuery = true)
    Optional<Integer> findUserRankInLeaderboard(
            @Param("leaderboardId") UUID leaderboardId,
            @Param("userId") UUID userId);

    Optional<LeaderboardEntry> findById_LeaderboardIdAndId_UserIdAndIsDeletedFalse(
            UUID leaderboardId,
            UUID userId);

    @Transactional
    @Modifying
    @Query("UPDATE LeaderboardEntry le " +
            "SET le.isDeleted = true, le.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE le.id.leaderboardId = :leaderboardId " +
            "AND le.id.userId = :userId " +
            "AND le.isDeleted = false")
    void softDeleteByLeaderboardIdAndUserId(
            @Param("leaderboardId") UUID leaderboardId,
            @Param("userId") UUID userId);

    @Query("SELECT le FROM LeaderboardEntry le " +
            "JOIN le.user u ON le.id.userId = u.userId " +
            "WHERE le.id.leaderboardId = :leaderboardId " +
            "AND le.isDeleted = false AND u.isDeleted = false " +
            "ORDER BY u.exp DESC, le.score DESC")
    List<LeaderboardEntry> findTopLeadersByLeaderboardId(
            @Param("leaderboardId") UUID leaderboardId,
            Pageable pageable);


    @Query(value = "SELECT rank FROM (" +
                   " SELECT user_id, RANK() OVER (ORDER BY score DESC) as rank " +
                   " FROM leaderboard_entries WHERE leaderboard_id = :leaderboardId" +
                   ") t WHERE user_id = :userId", nativeQuery = true)
    Integer findRankByLeaderboardAndUser(@Param("leaderboardId") UUID leaderboardId,
                                         @Param("userId") UUID userId);

    @Query("SELECT le FROM LeaderboardEntry le JOIN le.leaderboard l " +
           "WHERE l.period = :period AND l.tab = :tab AND l.snapshotDate = :date AND le.isDeleted = false " +
           "ORDER BY le.score DESC")
    Page<LeaderboardEntry> findTopUsers(
            @Param("period") String period,
            @Param("tab") String tab,
            @Param("date") LocalDate date,
            Pageable pageable
    );

    @Query(value = "SELECT rank FROM (" +
                   " SELECT user_id, RANK() OVER (ORDER BY score DESC) as rank " +
                   " FROM leaderboard_entries WHERE leaderboard_id = (SELECT leaderboard_id FROM leaderboards WHERE tab = :tab ORDER BY created_at DESC LIMIT 1)" +
                   ") t WHERE user_id = :userId", nativeQuery = true)
    Integer findRankByUserAndTab(@Param("userId") UUID userId, @Param("tab") String tab, @Param("type") String type);

    @Query("SELECT le FROM LeaderboardEntry le " +
           "WHERE le.id.leaderboardId = :leaderboardId " +
           "AND le.id.userId = :userId " +
           "AND le.isDeleted = false")
    Page<LeaderboardEntry> findByLeaderboardIdAndUserIdAndIsDeletedFalse(
            @Param("leaderboardId") UUID leaderboardId,
            @Param("userId") UUID userId,
            Pageable pageable);

    @Query("SELECT le FROM LeaderboardEntry le " +
           "WHERE le.id.leaderboardId = :leaderboardId " +
           "AND le.id.userId = :userId " +
           "AND le.isDeleted = false")
    Optional<LeaderboardEntry> findByLeaderboardIdAndUserIdAndIsDeletedFalse(
            @Param("leaderboardId") UUID leaderboardId,
            @Param("userId") UUID userId);


    @Query("SELECT le FROM LeaderboardEntry le " +
           "JOIN User u ON le.leaderboardEntryId.userId = u.userId " + // Lưu ý: Giả định entity User được join đúng cách
           "WHERE le.leaderboardEntryId.leaderboardId = :leaderboardId " +
           "AND le.isDeleted = false AND u.isDeleted = false " +
           "ORDER BY u.level DESC")
    List<LeaderboardEntry> findTop3ByLeaderboardIdOrderByUserLevelDesc(
            @Param("leaderboardId") UUID leaderboardId,
            Pageable pageable);

}