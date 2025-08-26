package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RoadmapMilestoneRepository extends JpaRepository<RoadmapMilestone, UUID> {
    List<RoadmapMilestone> findByRoadmapIdOrderByOrderIndexAsc(UUID roadmapId);

    @Modifying
    @Query("UPDATE RoadmapMilestone m SET m.isDeleted = true, m.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE m.roadmapId = :roadmapId AND m.isDeleted = false")
    void deleteByRoadmapIdAndIsDeletedFalse(@Param("roadmapId") UUID roadmapId);
}

