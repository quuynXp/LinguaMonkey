package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapItem;

import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface RoadmapItemRepository extends JpaRepository<RoadmapItem, UUID> {
    List<RoadmapItem> findByRoadmapIdOrderByOrderIndexAsc(UUID roadmapId);

    @Modifying
    @Query("UPDATE RoadmapItem i SET i.isDeleted = true, i.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE i.roadmapId = :roadmapId AND i.isDeleted = false")
    void deleteByRoadmapIdAndIsDeletedFalse(@Param("roadmapId") UUID roadmapId);
}

