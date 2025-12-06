package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RoadmapResourceRepository extends JpaRepository<RoadmapResource, UUID> {

    List<RoadmapResource> findByItemId(UUID itemId);

    @Query("SELECT r FROM RoadmapResource r WHERE r.itemId IN " +
            "(SELECT i.itemId FROM RoadmapItem i WHERE i.roadmap.roadmapId = :roadmapId)")
    List<RoadmapResource> findByRoadmapId(@Param("roadmapId") UUID roadmapId);

    @Modifying
    @Query("UPDATE RoadmapResource r SET r.isDeleted = true, r.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE r.itemId IN (SELECT i.itemId FROM RoadmapItem i WHERE i.roadmap.roadmapId = :roadmapId) " +
            "AND r.isDeleted = false")
    void deleteByRoadmapIdAndIsDeletedFalse(@Param("roadmapId") UUID roadmapId);

    List<RoadmapResource> findByRoadmapIdAndIsDeletedFalse(UUID roadmapId);
}