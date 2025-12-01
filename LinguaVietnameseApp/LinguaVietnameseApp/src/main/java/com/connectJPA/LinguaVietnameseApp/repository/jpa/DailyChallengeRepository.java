package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, UUID> {
    @Query(value = "SELECT * FROM daily_challenges WHERE language_code = :langCode AND period = :period AND is_deleted = false ORDER BY RANDOM() LIMIT :limit", nativeQuery = true)
    List<DailyChallenge> findRandomChallengesByLangAndPeriod(@Param("langCode") String langCode, 
                                                             @Param("period") String period, 
                                                             @Param("limit") int limit);

    List<DailyChallenge> findByIsDeletedFalse();

    // Thêm query lọc theo ngôn ngữ và chưa bị xóa
    List<DailyChallenge> findByLanguageCodeAndIsDeletedFalse(String languageCode);
}
