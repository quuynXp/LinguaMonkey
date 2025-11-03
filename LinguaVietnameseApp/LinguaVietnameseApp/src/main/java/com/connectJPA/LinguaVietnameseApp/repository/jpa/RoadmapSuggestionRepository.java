package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoadmapSuggestionRepository extends JpaRepository<RoadmapSuggestion, UUID> {
    List<RoadmapSuggestion> findByRoadmapRoadmapId(UUID roadmapId);
}
