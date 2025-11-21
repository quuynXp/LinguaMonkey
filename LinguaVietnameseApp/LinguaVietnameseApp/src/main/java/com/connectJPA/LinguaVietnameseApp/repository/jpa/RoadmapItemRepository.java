package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.RoadmapItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param; // FIX: Dùng đúng package của Spring Data

import java.util.List;
import java.util.UUID;

public interface RoadmapItemRepository extends JpaRepository<RoadmapItem, UUID> {

    List<RoadmapItem> findByRoadmapRoadmapIdOrderByOrderIndexAsc(UUID roadmapId);

    List<RoadmapItem> findByRoadmapRoadmapId(UUID roadmapId);

    @Query("SELECT COUNT(ri) FROM RoadmapItem ri WHERE ri.roadmap.roadmapId = :roadmapId AND ri.isDeleted = false")
    int countByRoadmapId(@Param("roadmapId") UUID roadmapId);

    @Modifying
    @Query("UPDATE RoadmapItem i SET i.isDeleted = true, i.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE i.roadmap.roadmapId = :roadmapId AND i.isDeleted = false")
    void deleteByRoadmapIdAndIsDeletedFalse(@Param("roadmapId") UUID roadmapId);

    default List<RoadmapItem> findByRoadmapIdOrderByOrderIndexAsc(UUID roadmapId) {
        return findByRoadmapRoadmapIdOrderByOrderIndexAsc(roadmapId);
    }

    default List<RoadmapItem> findByRoadmapId(UUID roadmapId) {
        return findByRoadmapRoadmapId(roadmapId);
    }
}