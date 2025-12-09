package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapFavorite;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RoadmapFavoriteRepository extends JpaRepository<RoadmapFavorite, UserRoadmapId> {
    long countByRoadmapRoadmapId(UUID roadmapId);
    boolean existsById(UserRoadmapId id);
}