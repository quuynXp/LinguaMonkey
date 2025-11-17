package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface UserDailyChallengeRepository extends JpaRepository<UserDailyChallenge, UserDailyChallengeId> {
    List<UserDailyChallenge> findByIdUserIdAndIdAssignedDate(UUID userId, OffsetDateTime assignedDate);

    List<UserDailyChallenge> findByUser_UserIdAndCreatedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

    long countByIdUserIdAndIsCompletedTrue(UUID userId);

    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.isDeleted = false " +
           "AND udc.assignedAt >= :startOfDay AND udc.assignedAt <= :endOfDay")
    List<UserDailyChallenge> findChallengesForToday(
            @Param("userId") UUID userId,
            @Param("startOfDay") OffsetDateTime startOfDay,
            @Param("endOfDay") OffsetDateTime endOfDay
    );

    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.id.challengeId = :challengeId " +
           "AND udc.isDeleted = false " +
           "AND udc.assignedAt >= :startOfDay AND udc.assignedAt <= :endOfDay")
    List<UserDailyChallenge> findChallengeForToday(
            @Param("userId") UUID userId,
            @Param("challengeId") UUID challengeId,
            @Param("startOfDay") OffsetDateTime startOfDay,
            @Param("endOfDay") OffsetDateTime endOfDay
    );
}
