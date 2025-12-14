package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, UUID> {

    @Query(value = """
        SELECT * FROM daily_challenges dc
        WHERE dc.language_code = :langCode 
        AND dc.period = :period 
        AND dc.is_deleted = false
        AND dc.id NOT IN (
            SELECT udc.challenge_id FROM user_daily_challenges udc 
            WHERE udc.user_id = :userId 
            AND udc.assigned_at >= :startOfDay 
            AND udc.assigned_at <= :endOfDay
        )
        ORDER BY RANDOM() 
        LIMIT :limit
    """, nativeQuery = true)
    List<DailyChallenge> findNewChallengesForUser(
            @Param("userId") UUID userId,
            @Param("langCode") String langCode,
            @Param("period") String period,
            @Param("startOfDay") String startOfDay,
            @Param("endOfDay") String endOfDay,
            @Param("limit") int limit
    );

    @Query(value = """
        SELECT * FROM daily_challenges dc
        WHERE dc.language_code = 'en' 
        AND dc.period = :period 
        AND dc.is_deleted = false
        AND dc.id NOT IN (
            SELECT udc.challenge_id FROM user_daily_challenges udc 
            WHERE udc.user_id = :userId 
            AND udc.assigned_at >= :startOfDay 
            AND udc.assigned_at <= :endOfDay
        )
        ORDER BY RANDOM() 
        LIMIT :limit
    """, nativeQuery = true)
    List<DailyChallenge> findFallbackChallengesForUser(
            @Param("userId") UUID userId,
            @Param("period") String period,
            @Param("startOfDay") String startOfDay,
            @Param("endOfDay") String endOfDay,
            @Param("limit") int limit
    );
    
    List<DailyChallenge> findByLanguageCodeAndIsDeletedFalse(String languageCode);

    @Query(value = """
        SELECT * FROM daily_challenges dc
        WHERE dc.language_code = :languageCode
        AND dc.period = :period
        AND dc.is_deleted = false
        ORDER BY RANDOM()
        LIMIT :limit
    """, nativeQuery = true)
    List<DailyChallenge> findRandomChallengesByLanguageCodeAndPeriod(
            @Param("languageCode") String languageCode,
            @Param("period") String period,
            @Param("limit") int limit
    );
}