package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapGuidance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface RoadmapGuidanceRepository extends JpaRepository<RoadmapGuidance, UUID> {
    @Modifying
    @Query("UPDATE RoadmapGuidance g SET g.isDeleted = true, g.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE g.itemId IN (SELECT i.itemId FROM RoadmapItem i WHERE i.roadmapId = :roadmapId) " +
            "AND g.isDeleted = false")
    void deleteByRoadmapIdAndIsDeletedFalse(@Param("roadmapId") UUID roadmapId);
}

