package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoadmapSuggestionRepository extends JpaRepository<RoadmapSuggestion, UUID> {

    // FIX: Sử dụng JPQL để map chính xác User ID, Roadmap ID và Item ID
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM RoadmapSuggestion s " +
            "WHERE s.user.userId = :userId AND s.roadmap.roadmapId = :roadmapId AND s.itemId = :itemId")
    boolean existsByUserAndRoadmapAndItem(@Param("userId") UUID userId,
                                          @Param("roadmapId") UUID roadmapId,
                                          @Param("itemId") UUID itemId);

    // Các method khác được sử dụng trong Service
    List<RoadmapSuggestion> findByRoadmapRoadmapId(UUID roadmapId);

    List<RoadmapSuggestion> findByRoadmapRoadmapIdOrderByCreatedAtDesc(UUID roadmapId);

    long countByRoadmapRoadmapIdAndAppliedFalse(UUID roadmapId);
}