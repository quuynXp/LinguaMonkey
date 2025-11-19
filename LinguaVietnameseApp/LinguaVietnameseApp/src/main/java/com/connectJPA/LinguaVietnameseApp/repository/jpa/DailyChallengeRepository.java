package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, UUID> {
    @Query(value = "SELECT * FROM daily_challenges WHERE is_deleted = false ORDER BY random() LIMIT :count", nativeQuery = true)
    List<DailyChallenge> findRandomChallenges(@Param("count") int count);

    List<DailyChallenge> findByIsDeletedFalse();
}
