package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserDailyChallengeRepository extends JpaRepository<UserDailyChallenge, UserDailyChallengeId> {
    List<UserDailyChallenge> findByIdUserIdAndIdAssignedDate(UUID userId, OffsetDateTime assignedDate);


    @Query("SELECT CASE WHEN COUNT(udc) > 0 THEN true ELSE false END " +
           "FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.challenge.period = :period " +
           "AND udc.assignedAt BETWEEN :start AND :end")
    boolean existsByUserIdAndPeriodAndDateRange(@Param("userId") UUID userId,
                                                @Param("period") ChallengePeriod period,
                                                @Param("start") OffsetDateTime start,
                                                @Param("end") OffsetDateTime end);

    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.challenge.period = :period " +
           "AND udc.assignedAt BETWEEN :start AND :end")
    List<UserDailyChallenge> findChallengesByPeriodAndDateRange(@Param("userId") UUID userId,
                                                                @Param("period") ChallengePeriod period,
                                                                @Param("start") OffsetDateTime start,
                                                                @Param("end") OffsetDateTime end);

    // Queries below for progress updates (Active items only)
    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.challenge.period = :period " +
           "AND udc.status = 'IN_PROGRESS' " +
           "AND udc.assignedAt >= :validAfter")
    List<UserDailyChallenge> findActiveByPeriod(@Param("userId") UUID userId,
                                                @Param("period") ChallengePeriod period,
                                                @Param("validAfter") OffsetDateTime validAfter);

    List<UserDailyChallenge> findByUser_UserIdAndCreatedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

    Optional<UserDailyChallenge> findById_UserIdAndId_ChallengeId(UUID userId, UUID challengeId);
    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.challenge.period = :period " +
           "AND udc.status = 'IN_PROGRESS' " +
           "AND udc.assignedAt BETWEEN :start AND :end")
    List<UserDailyChallenge> findActiveChallenges(@Param("userId") UUID userId,
                                                  @Param("period") ChallengePeriod period,
                                                  @Param("start") OffsetDateTime start,
                                                  @Param("end") OffsetDateTime end);

    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.challenge.challengeType = :type " +
           "AND udc.status = 'IN_PROGRESS'")
    List<UserDailyChallenge> findInProgressChallengesByType(@Param("userId") UUID userId, 
                                                            @Param("type") ChallengeType type);

    @Query("SELECT udc FROM UserDailyChallenge udc " +
           "WHERE udc.id.userId = :userId " +
           "AND udc.id.challengeId = :challengeId " +
           "AND udc.status = 'CAN_CLAIM' " +
           "AND udc.assignedAt BETWEEN :start AND :end")
    Optional<UserDailyChallenge> findClaimableChallenge(@Param("userId") UUID userId,
                                                        @Param("challengeId") UUID challengeId,
                                                        @Param("start") OffsetDateTime start,
                                                        @Param("end") OffsetDateTime end);
                                                        
     long countByIdUserIdAndStatus(UUID userId, ChallengeStatus status);
     
    long countByIdUserIdAndIsCompletedTrue(UUID userId);

    @Query("SELECT udc FROM UserDailyChallenge udc WHERE udc.id.userId = :userId " +
           "AND udc.assignedAt BETWEEN :start AND :end")
    List<UserDailyChallenge> findChallengesForToday(@Param("userId") UUID userId, 
                                                    @Param("start") OffsetDateTime start, 
                                                    @Param("end") OffsetDateTime end);

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

    List<UserDailyChallenge> findByUser_UserIdAndCompletedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);
}
