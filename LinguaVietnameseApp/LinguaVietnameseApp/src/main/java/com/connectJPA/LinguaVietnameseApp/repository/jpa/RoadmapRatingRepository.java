package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapRating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoadmapRatingRepository extends JpaRepository<RoadmapRating, UUID> {
    List<RoadmapRating> findByRoadmapRoadmapIdAndIsDeletedFalse(UUID roadmapId);
}
